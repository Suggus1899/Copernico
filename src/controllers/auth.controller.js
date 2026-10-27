import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { AppError } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildProfileSet } from '../utils/profileUpdate.js';
import { issueSession, clearSession } from '../utils/session.js';

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

const invalidCredentials = () =>
  new AppError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos.');
const invalidCurrentPassword = () =>
  new AppError(400, 'INVALID_CURRENT_PASSWORD', 'La contraseña actual no es correcta.');
const emailAlreadyRegistered = () =>
  new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Ya existe una cuenta con ese correo.');
const accountNotFound = () => new AppError(404, 'NOT_FOUND', 'Usuario no encontrado.');

const isDuplicateKey = (error) => error?.code === 11000;
const isLocked = (user) => Boolean(user.lockedUntil && user.lockedUntil > new Date());

// Hash de referencia: iguala el coste de bcrypt cuando el correo no existe o la cuenta está bloqueada.
let referenceHash;
const getReferenceHash = () => {
  referenceHash ??= bcrypt.hashSync('copernico-reference-password', BCRYPT_ROUNDS);
  return referenceHash;
};

const loadUserWithPassword = async (userId) => {
  const user = await User.findById(userId).select('+password');
  if (!user) throw accountNotFound();
  return user;
};

const assertCurrentPassword = async (user, currentPassword) => {
  if (!(await user.comparePassword(currentPassword))) {
    throw invalidCurrentPassword();
  }
};

export const signup = asyncHandler(async (req, res) => {
  const { email, password, role, personalInfo, studentProfile, tutorProfile } = req.body;
  const user = new User({
    email,
    password,
    role,
    personalInfo,
    studentProfile: role === 'student' ? studentProfile : undefined,
    tutorProfile: role === 'tutor' ? tutorProfile : undefined,
  });

  try {
    await user.save();
  } catch (error) {
    if (isDuplicateKey(error)) throw emailAlreadyRegistered();
    throw error;
  }

  issueSession(res, user);
  res.status(201).json({ success: true, data: user });
});

export const signin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');

  // Correo inexistente, cuenta bloqueada y contraseña incorrecta responden igual y con el mismo coste.
  if (!user || isLocked(user)) {
    await bcrypt.compare(password, getReferenceHash());
    throw invalidCredentials();
  }

  if (!(await user.comparePassword(password))) {
    const counter = await User.findByIdAndUpdate(
      user._id,
      { $inc: { loginAttempts: 1 } },
      { new: true }
    ).select('loginAttempts').lean();

    if (counter?.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
      await User.updateOne(
        { _id: user._id },
        { $set: { loginAttempts: 0, lockedUntil: new Date(Date.now() + LOCK_DURATION_MS) } }
      );
    }
    throw invalidCredentials();
  }

  if (user.status !== 'active') {
    throw new AppError(403, 'ACCOUNT_UNAVAILABLE', 'La cuenta no está disponible.');
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { loginAttempts: 0, lastLogin: new Date() }, $unset: { lockedUntil: 1 } }
  );
  issueSession(res, user);
  res.json({ success: true, data: user });
});

export const signout = (req, res) => {
  clearSession(res);
  res.json({ success: true });
};

export const profile = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw accountNotFound();
  res.json({ success: true, data: user });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const user = await User.findByIdAndUpdate(
    req.user._id,
    { $set: { ...buildProfileSet(req.body), updatedBy: req.user._id } },
    { new: true, runValidators: true }
  );
  if (!user) throw accountNotFound();
  res.json({ success: true, data: user });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await loadUserWithPassword(req.user._id);
  await assertCurrentPassword(user, currentPassword);

  if (newPassword === currentPassword) {
    throw new AppError(400, 'PASSWORD_UNCHANGED', 'La nueva contraseña debe ser distinta a la actual.');
  }

  user.password = newPassword;
  user.sessionVersion += 1; // invalida las demás sesiones abiertas
  await user.save({ validateModifiedOnly: true });
  issueSession(res, user);
  res.json({ success: true, data: user });
});

export const changeEmail = asyncHandler(async (req, res) => {
  const { currentPassword, newEmail } = req.body;
  const user = await loadUserWithPassword(req.user._id);
  await assertCurrentPassword(user, currentPassword);

  if (newEmail === user.email) {
    throw new AppError(400, 'EMAIL_UNCHANGED', 'El nuevo correo es igual al actual.');
  }
  if (await User.exists({ email: newEmail, _id: { $ne: user._id } })) {
    throw emailAlreadyRegistered();
  }

  user.email = newEmail;
  user.sessionVersion += 1;
  try {
    await user.save({ validateModifiedOnly: true });
  } catch (error) {
    if (isDuplicateKey(error)) throw emailAlreadyRegistered();
    throw error;
  }
  issueSession(res, user);
  res.json({ success: true, data: user });
});

export const deactivateAccount = asyncHandler(async (req, res) => {
  const { currentPassword } = req.body;
  const user = await loadUserWithPassword(req.user._id);
  await assertCurrentPassword(user, currentPassword);

  user.status = 'inactive';
  user.sessionVersion += 1;
  await user.save({ validateModifiedOnly: true });
  clearSession(res);
  res.json({ success: true });
});
