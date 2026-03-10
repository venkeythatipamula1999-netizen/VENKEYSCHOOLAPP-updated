import React from 'react';
import TeacherSendDocument from '../teacher/TeacherSendDocument';

export default function AdminSendDocument({ currentUser, onBack }) {
  return (
    <TeacherSendDocument
      currentUser={currentUser}
      onBack={onBack}
      isAdmin={true}
    />
  );
}
