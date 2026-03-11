import React, { useEffect } from 'react';
import { BackHandler } from 'react-native';
import TeacherSendDocument from '../teacher/TeacherSendDocument';

export default function AdminSendDocument({ currentUser, onBack }) {
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => sub.remove();
  }, [onBack]);

  return (
    <TeacherSendDocument
      currentUser={currentUser}
      onBack={onBack}
      isAdmin={true}
    />
  );
}
