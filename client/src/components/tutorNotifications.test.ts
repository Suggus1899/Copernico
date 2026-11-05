import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { createServer } from 'vite';
import type { Notification } from '../types/communication';

test('appointment requests expose actions only while pending and confirm through the appointment API', async () => {
  const vite = await createServer({ configFile: false, optimizeDeps: { noDiscovery: true }, server: { middlewareMode: true, hmr: false }, appType: 'custom' });
  try {
    const { default: Notifications } = await vite.ssrLoadModule('/src/components/TutorNotifications.tsx');
    const { default: api } = await vite.ssrLoadModule('/src/utils/axiosConfig.ts');
    const notification: Notification = {
      _id: 'notification', title: 'Nueva solicitud', message: 'Pendiente de confirmar', type: 'appointment_requested',
      priority: 'medium', category: 'appointment', read: false, allowResponse: true, createdAt: new Date().toISOString(),
      relatedAppointment: { _id: 'appointment', startsAt: new Date(Date.now() + 86400000).toISOString(), status: 'pending' },
    };
    const view = new Notifications({});
    view.state = { ...view.state, loading: false, notifications: [notification] };
    view.setState = (update: object | ((state: typeof view.state) => object)) => Object.assign(view.state, typeof update === 'function' ? update(view.state) : update);
    assert.match(renderToStaticMarkup(view.render()), /Aceptar solicitud/);
    assert.match(renderToStaticMarkup(view.render()), /Rechazar/);
    const requests: string[] = [];
    api.post = async (url: string) => { requests.push(url); return { data: { success: true } }; };
    const fetchNotifications = view.fetchNotifications;
    view.fetchNotifications = async () => {};
    await view.confirmAppointment(notification.relatedAppointment, notification._id);
    assert.deepEqual(requests, ['/appointments/appointment/confirm', '/notifications/notification/respond']);
    assert.doesNotMatch(renderToStaticMarkup(view.render()), /Aceptar solicitud/);
    view.state.notifications = [{ ...notification, allowResponse: false }];
    requests.length = 0;
    api.patch = async (url: string) => { requests.push(url); return { data: { success: true } }; };
    await view.confirmAppointment(notification.relatedAppointment, notification._id);
    assert.deepEqual(requests, ['/appointments/appointment/confirm', '/notifications/notification/read']);
    let params: unknown;
    api.get = async (_url: string, config: { params: unknown }) => {
      params = config.params;
      return { data: { data: [], pagination: { page: 2, limit: 20, total: 45, pages: 3 }, unreadCount: 23 } };
    };
    view.state.filter = 'appointment_requested';
    view.state.page = 2;
    await fetchNotifications();
    assert.deepEqual(params, { page: 2, limit: 20, type: 'appointment_requested' });
    assert.equal(view.state.unreadCount, 23);
    assert.match(renderToStaticMarkup(view.render()), /Páginas de notificaciones/);
    view.state.notifications = [{ ...notification, relatedAppointment: { ...notification.relatedAppointment as object, status: 'confirmed' } }];
    assert.doesNotMatch(renderToStaticMarkup(view.render()), /Aceptar solicitud/);
  } finally { await vite.close(); }
});
