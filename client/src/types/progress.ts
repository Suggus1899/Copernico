import type { UserSummary } from './auth';
export interface VideoProgress {
  progressPercentage: number; isCompleted: boolean; watchTime: number; status: 'not_started' | 'in_progress' | 'completed' | 'paused';
  currentTime?: number; totalDuration?: number; lastWatchedAt?: string; completedAt?: string | null;
}
export interface ClassVideo<Author = UserSummary | null> {
  _id: string; title: string; description?: string; subject: string; topic?: string;
  grade?: string; duration?: number; visibility: 'private' | 'students' | 'public'; tags: string[];
  thumbnailUrl?: string; youtubeId: string; youtubeUrl?: string; createdAt: string; updatedAt: string;
  createdBy?: UserSummary | null; uploadedBy?: Author; views: number; likes: number;
  progress?: VideoProgress | null;
}
export interface SubjectStats {
  subject: string; totalVideos: number; completedVideos: number; totalWatchTimeHours: number;
  averageProgress: number; completionRate?: number;
}
export interface VideoDashboard {
  subjectStats: SubjectStats[];
  mostWatched: VideoProgressItem[];
  recentProgress: VideoProgressItem[];
  recentlyCompleted: VideoProgressItem[];
}
export interface VideoProgressItem extends VideoProgress {
  lastWatchedAt: string; completedAt?: string | null;
  _id: string; videoId: (Pick<ClassVideo, '_id' | 'title' | 'subject' | 'topic'> & Partial<Pick<ClassVideo, 'thumbnailUrl' | 'views'>>) | null; videoTitle?: string; videoSubject?: string;
}
export interface StudentVideoStats {
  bySubject: SubjectStats[];
  overall: {
    totalVideosWatched: number; totalCompletedVideos: number;
    totalWatchTimeHours?: number; averageCompletionRate?: number;
  };
}
