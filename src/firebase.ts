import { initializeApp, getApps } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey:            'AIzaSyD5YlKjvei-By6RkIp0s4szw48xIzIG3jE',
  authDomain:        'eviate-tmpxbmi270.firebaseapp.com',
  databaseURL:       'https://eviate-tmpxbmi270-default-rtdb.firebaseio.com',
  projectId:         'eviate-tmpxbmi270',
  storageBucket:     'eviate-tmpxbmi270.firebasestorage.app',
  messagingSenderId: '1067107981907',
  appId:             '1:1067107981907:web:671743da04b6c436a0c4a6',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
