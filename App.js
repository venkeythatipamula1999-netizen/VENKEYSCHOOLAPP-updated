import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Platform, SafeAreaView, StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { C } from './src/theme/colors';
import { S } from './src/theme/styles';
import Icon from './src/components/Icon';
import { INITIAL_LEAVE_REQS } from './src/data/teacher';
import { ErrorBoundary } from './src/components/ErrorBoundary';
import { useGlobalErrorListener } from './src/hooks/useGlobalErrorListener';
import { setErrorReporterUser, clearErrorReporterUser } from './src/services/errorReporter';
import OfflineBanner from './src/components/OfflineBanner';

import SplashScreen from './src/screens/auth/SplashScreen';
import SplashIntroScreen from './src/screens/auth/SplashIntroScreen';
import LoginScreen from './src/screens/auth/LoginScreen';
import ParentLoginScreen from './src/screens/auth/ParentLoginScreen';
import ParentPortalScreen from './src/screens/auth/ParentPortalScreen';
import ParentRegisterScreen from './src/screens/auth/ParentRegisterScreen';
import SignupScreen from './src/screens/auth/SignupScreen';
import ParentDashboard from './src/screens/parent/ParentDashboard';
import AttendanceScreen from './src/screens/parent/AttendanceScreen';
import MarksScreen from './src/screens/parent/MarksScreen';
import BusScreen from './src/screens/parent/BusScreen';
import NotificationsScreen from './src/screens/parent/NotificationsScreen';
import FeeScreen from './src/screens/parent/FeeScreen';
import LeaveScreen from './src/screens/parent/LeaveScreen';
import DigitalFolder from './src/screens/parent/DigitalFolder';
import ActivitiesScreen from './src/screens/parent/ActivitiesScreen';
import ExploreScreen from './src/screens/ExploreScreen';
import ContactScreen from './src/screens/ContactScreen';
import TeacherDashboard from './src/screens/teacher/TeacherDashboard';
import TeacherAttendance from './src/screens/teacher/TeacherAttendance';
import TeacherMarksScreen from './src/screens/teacher/TeacherMarksScreen';
import TeacherScheduleScreen from './src/screens/teacher/TeacherScheduleScreen';
import TeacherBusMonitor from './src/screens/teacher/TeacherBusMonitor';
import TeacherAlertsScreen from './src/screens/teacher/TeacherAlertsScreen';
import TeacherPersonalScreen from './src/screens/teacher/TeacherPersonalScreen';
import TeacherProfile from './src/screens/teacher/TeacherProfile';
import TeacherSendDocument from './src/screens/teacher/TeacherSendDocument';
import AdminOverview from './src/screens/admin/AdminOverview';
import AdminSendDocument from './src/screens/admin/AdminSendDocument';
import AdminStudents from './src/screens/admin/AdminStudents';
import AdminUsers from './src/screens/admin/AdminUsers';
import AdminClasses from './src/screens/admin/AdminClasses';
import AdminBuses from './src/screens/admin/AdminBuses';
import AdminReports from './src/screens/admin/AdminReports';
import AdminAlerts from './src/screens/admin/AdminAlerts';
import AdminActivities from './src/screens/admin/AdminActivities';
import AdminSettings from './src/screens/admin/AdminSettings';
import AdminStudentQR from './src/screens/admin/AdminStudentQR';
import AdminLeaveScreen from './src/screens/admin/AdminLeaveScreen';
import AdminFeeScreen from './src/screens/admin/AdminFeeScreen';
import AdminSalaryScreen from './src/screens/admin/AdminSalaryScreen';
import AdminPromotion from './src/screens/admin/AdminPromotion';
import AdminFeeStatus from './src/screens/admin/AdminFeeStatus';
import AdminProfile from './src/screens/admin/AdminProfile';
import DriverDashboard from './src/screens/driver/DriverDashboard';
import DriverScans from './src/screens/driver/DriverScans';
import DriverDuration from './src/screens/driver/DriverDuration';
import DriverProfile from './src/screens/driver/DriverProfile';
import DriverStudentLocations from './src/screens/driver/DriverStudentLocations';
import DriverLeave from './src/screens/driver/DriverLeave';
import DriverProximityAlerts from './src/screens/driver/DriverProximityAlerts';
import CleanerDashboard from './src/screens/cleaner/CleanerDashboard';
import CleanerScanner from './src/screens/cleaner/CleanerScanner';
import CleanerDuration from './src/screens/cleaner/CleanerDuration';
import CleanerAlerts from './src/screens/cleaner/CleanerAlerts';
import CleanerProfile from './src/screens/cleaner/CleanerProfile';
import CleanerLeave from './src/screens/cleaner/CleanerLeave';
import CompleteProfileScreen from './src/screens/auth/CompleteProfileScreen';
import { STUDENTS_INIT as STUDENTS_INIT_CLEANER, NOTIFS_INIT as NOTIFS_INIT_CLEANER } from './src/data/cleaner';

export default function App() {
  useGlobalErrorListener();
  
  const [screen, setScreen] = useState('splash-intro');
  const [role, setRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [leaveRequests, setLeaveRequests] = useState(INITIAL_LEAVE_REQS);
  const [cleanerStudents, setCleanerStudents] = useState(STUDENTS_INIT_CLEANER);
  const [cleanerNotifs, setCleanerNotifs] = useState(NOTIFS_INIT_CLEANER);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (currentUser) {
      setErrorReporterUser(currentUser);
    } else {
      clearErrorReporterUser();
    }
  }, [currentUser]);

  useEffect(() => {
    global.__onAuthExpired = () => {
      setCurrentUser(null);
      setRole(null);
      navigate('splash');
      setTimeout(() => {
        alert('Your session has expired. Please log in again.');
      }, 300);
    };

    return () => {
      global.__onAuthExpired = null;
    };
  }, []);

  useEffect(() => {
    const checkStoredAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('authToken');
        if (!token) return;

        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiry = payload.exp * 1000;
        const now = Date.now();

        if (expiry < now) {
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('schoolId');
          console.log('[Auth] Stored token expired — cleared');
        }
      } catch (e) {
        await AsyncStorage.removeItem('authToken');
        await AsyncStorage.removeItem('schoolId');
      }
    };

    checkStoredAuth();
  }, []);

  const navigate = (s) => {
    setScreen(s);
    if (scrollRef.current && scrollRef.current.scrollTo) {
      scrollRef.current.scrollTo({ y: 0, animated: false });
    }
  };

  const adminScreens = ['admin-home', 'admin-users', 'admin-classes', 'admin-buses', 'admin-reports', 'admin-alerts', 'admin-settings', 'admin-activities', 'admin-leaves', 'admin-fees', 'admin-salary', 'admin-profile', 'admin-promotion', 'admin-fee-status', 'admin-send-document'];

  const navigateToDashboard = (userRole) => {
    if (userRole === 'principal') navigate('admin-home');
    else if (userRole === 'driver') navigate('driver-home');
    else if (userRole === 'cleaner') navigate('cleaner-home');
    else if (userRole === 'teacher' || userRole === 'staff') navigate('teacher-home');
    else navigate('parent-home');
  };

  const handleLoginSuccess = (userData, _requiresPIN, _token) => {
    const userRole = userData.role;
    setRole(userRole);
    setCurrentUser(userData);
    if (!userData.profileCompleted) {
      navigate('complete-profile');
    } else {
      navigateToDashboard(userRole);
    }
  };

  const handleSignupSuccess = (data) => {
    const user = data.user || data;
    setCurrentUser(user);
    setRole(user.role);
    navigate('complete-profile');
  };

  const handleProfileComplete = (updatedUser) => {
    setCurrentUser(updatedUser);
    navigateToDashboard(updatedUser.role);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('authToken');
    await AsyncStorage.removeItem('schoolId');
    setCurrentUser(null);
    setRole(null);
    navigate('splash');
  };

  const driverScreens = ['driver-home', 'driver-scans', 'driver-locations', 'driver-duration', 'driver-profile', 'driver-leave', 'driver-proximity'];
  const cleanerScreens = ['cleaner-home', 'cleaner-scanner', 'cleaner-duration', 'cleaner-alerts', 'cleaner-profile', 'cleaner-leave'];
  const isParentHome = ['parent-home', 'attendance', 'marks', 'bus', 'notifications', 'activities', 'fee', 'leave', 'digital-folder'].includes(screen);
  const isTeacherHome = ['teacher-home', 'teacher-attendance', 'teacher-marks', 'teacher-schedule', 'teacher-bus', 'teacher-alerts', 'teacher-personal', 'teacher-profile', 'teacher-send-document'].includes(screen);
  const isDriverHome = driverScreens.includes(screen);
  const isCleanerHome = cleanerScreens.includes(screen);
  const isAdminHome = adminScreens.includes(screen);

  const isDashboardScreen = isParentHome || isTeacherHome || isDriverHome || isCleanerHome || isAdminHome;
  if (currentUser && !currentUser.profileCompleted && isDashboardScreen) {
    return <CompleteProfileScreen currentUser={currentUser} onComplete={handleProfileComplete} />;
  }

  if (isAdminHome && role !== 'principal') {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, marginBottom: 8, textAlign: 'center' }}>Access Denied</Text>
        <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>Only the Principal can access the Admin Dashboard.</Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{ backgroundColor: C.gold, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 }}
        >
          <Text style={{ fontWeight: '600', fontSize: 15, color: C.navy }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isDriverHome && role !== 'driver') {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, marginBottom: 8, textAlign: 'center' }}>Access Denied</Text>
        <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>Only registered Drivers can access the Driver Dashboard.</Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{ backgroundColor: C.teal, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 }}
        >
          <Text style={{ fontWeight: '600', fontSize: 15, color: C.white }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (isCleanerHome && role !== 'cleaner') {
    return (
      <View style={{ flex: 1, backgroundColor: C.navy, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 20, fontWeight: '700', color: C.white, marginBottom: 8, textAlign: 'center' }}>Access Denied</Text>
        <Text style={{ fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24 }}>Only registered Cleaners can access the Cleaner Dashboard.</Text>
        <TouchableOpacity
          onPress={handleLogout}
          style={{ backgroundColor: C.gold, paddingVertical: 12, paddingHorizontal: 28, borderRadius: 14 }}
        >
          <Text style={{ fontWeight: '600', fontSize: 15, color: C.navy }}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const parentTabs = [
    { id: 'home', label: 'Home', icon: 'home', screen: 'parent-home' },
    { id: 'marks', label: 'Marks', icon: 'chart', screen: 'marks' },
    { id: 'activities', label: 'Activities', icon: 'star', screen: 'activities' },
    { id: 'bus', label: 'Bus', icon: 'bus', screen: 'bus' },
    { id: 'alerts', label: 'Alerts', icon: 'bell', screen: 'notifications' },
  ];

  const teacherTabs = [
    { id: 'home', label: 'Dashboard', icon: 'home', screen: 'teacher-home' },
    { id: 'attend', label: 'Attendance', icon: 'check', screen: 'teacher-attendance' },
    { id: 'marks', label: 'Marks', icon: 'chart', screen: 'teacher-marks' },
    { id: 'alerts', label: 'Alerts', icon: 'bell', screen: 'teacher-alerts' },
    { id: 'personal', label: 'My Leave', icon: 'star', screen: 'teacher-personal' },
    { id: 'profile', label: 'Profile', icon: 'user', screen: 'teacher-profile' },
  ];

  const adminTabs = [
    { id: 'home', label: 'Overview', icon: 'home', screen: 'admin-home' },
    { id: 'users', label: 'Users', icon: 'users', screen: 'admin-users' },
    { id: 'leaves', label: 'Leaves', icon: 'check', screen: 'admin-leaves' },
    { id: 'fees', label: 'Fees', icon: 'fee', screen: 'admin-fees' },
    { id: 'salary', label: 'Payroll', icon: 'chart', screen: 'admin-salary' },
  ];

  const driverTabs = [
    { id: 'home', label: 'Home', icon: 'home', screen: 'driver-home' },
    { id: 'scans', label: 'Scans', icon: 'scan', screen: 'driver-scans' },
    { id: 'locations', label: 'Locations', icon: 'navigate', screen: 'driver-locations' },
    { id: 'duration', label: 'Trips', icon: 'clock', screen: 'driver-duration' },
    { id: 'profile', label: 'Profile', icon: 'user', screen: 'driver-profile' },
    { id: 'leave', label: 'Leave', icon: 'leave', screen: 'driver-leave' },
  ];

  const cleanerTabs = [
    { id: 'home', label: 'Home', icon: 'home', screen: 'cleaner-home' },
    { id: 'scanner', label: 'Scanner', icon: 'scan', screen: 'cleaner-scanner' },
    { id: 'duration', label: 'Trips', icon: 'clock', screen: 'cleaner-duration' },
    { id: 'alerts', label: 'Alerts', icon: 'bell', screen: 'cleaner-alerts' },
    { id: 'profile', label: 'Profile', icon: 'user', screen: 'cleaner-profile' },
    { id: 'leave', label: 'Leave', icon: 'leave', screen: 'cleaner-leave' },
  ];

  const renderScreen = () => {
    switch (screen) {
      case 'splash-intro':
        return <SplashIntroScreen onFinish={() => navigate('splash')} />;
      case 'splash':
        return <SplashScreen onSelect={s => {
          if (s === 'teacher-login') setRole('teacher');
          navigate(s);
        }} />;
      case 'parent-portal':
        return <ParentPortalScreen onBack={() => navigate('splash')} onLoginSuccess={handleLoginSuccess} onNavigate={navigate} />;
      case 'parent-login':
        return <ParentLoginScreen onLoginSuccess={handleLoginSuccess} onBack={() => navigate('parent-portal')} onNavigate={navigate} />;
      case 'parent-register':
        navigate('parent-portal');
        return null;
      case 'teacher-login':
        return <LoginScreen role="teacher" onLoginSuccess={handleLoginSuccess} onBack={() => navigate('splash')} onNavigate={navigate} />;
      case 'driver-login':
        return <LoginScreen role="driver" onLoginSuccess={handleLoginSuccess} onBack={() => navigate('parent-portal')} onNavigate={navigate} />;
      case 'signup':
        return <SignupScreen onSignup={handleSignupSuccess} onBack={() => navigate(role === 'teacher' ? 'teacher-login' : 'parent-login')} />;
      case 'complete-profile':
        return <CompleteProfileScreen currentUser={currentUser} onComplete={handleProfileComplete} />;
      case 'parent-home': return <ParentDashboard onNavigate={navigate} currentUser={currentUser} onLogout={handleLogout} onUpdateUser={(u) => setCurrentUser(u)} />;
      case 'attendance': return <AttendanceScreen onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'marks': return <MarksScreen onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'bus': return <BusScreen onBack={() => navigate('parent-home')} />;
      case 'notifications': return <NotificationsScreen onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'activities': return <ActivitiesScreen onBack={() => navigate('parent-home')} />;
      case 'fee': return <FeeScreen onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'leave': return <LeaveScreen onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'digital-folder': return <DigitalFolder onBack={() => navigate('parent-home')} currentUser={currentUser} />;
      case 'teacher-home': return <TeacherDashboard onNavigate={navigate} currentUser={currentUser} onLogout={handleLogout} currentScreen={screen} />;
      case 'teacher-attendance': return <TeacherAttendance onBack={() => navigate('teacher-home')} currentUser={currentUser} />;
      case 'teacher-marks': return <TeacherMarksScreen onBack={() => navigate('teacher-home')} currentUser={currentUser} />;
      case 'teacher-schedule': return <TeacherScheduleScreen onBack={() => navigate('teacher-home')} currentUser={currentUser} />;
      case 'teacher-bus': return <TeacherBusMonitor onBack={() => navigate('teacher-home')} currentUser={currentUser} />;
      case 'teacher-alerts': return <TeacherAlertsScreen onBack={() => navigate('teacher-home')} requests={leaveRequests} setRequests={setLeaveRequests} currentUser={currentUser} />;
      case 'teacher-personal': return <TeacherPersonalScreen onBack={() => navigate('teacher-home')} currentUser={currentUser} />;
      case 'teacher-profile': return <TeacherProfile onBack={() => navigate('teacher-home')} currentUser={currentUser} onLogout={handleLogout} />;
      case 'teacher-send-document': return <TeacherSendDocument onBack={() => navigate('teacher-home')} currentUser={currentUser} isAdmin={false} />;
      case 'explore': return <ExploreScreen onBack={() => navigate('splash')} />;
      case 'contact': return <ContactScreen onBack={() => navigate('splash')} />;
      case 'driver-home': return <DriverDashboard onNavigate={navigate} currentUser={currentUser} />;
      case 'driver-scans': return <DriverScans onBack={() => navigate('driver-home')} />;
      case 'driver-locations': return <DriverStudentLocations onBack={() => navigate('driver-home')} currentUser={currentUser} />;
      case 'driver-duration': return <DriverDuration onBack={() => navigate('driver-home')} currentUser={currentUser} />;
      case 'driver-profile': return <DriverProfile onBack={() => navigate('driver-home')} currentUser={currentUser} onLogout={handleLogout} />;
      case 'driver-leave': return <DriverLeave onBack={() => navigate('driver-home')} currentUser={currentUser} />;
      case 'driver-proximity': return <DriverProximityAlerts onBack={() => navigate('driver-home')} currentUser={currentUser} />;
      case 'cleaner-home': return <CleanerDashboard onNavigate={navigate} currentUser={currentUser} students={cleanerStudents} />;
      case 'cleaner-scanner': return <CleanerScanner currentUser={currentUser} onBack={() => navigate('cleaner-home')} />;
      case 'cleaner-duration': return <CleanerDuration onBack={() => navigate('cleaner-home')} currentUser={currentUser} />;
      case 'cleaner-alerts': return <CleanerAlerts onBack={() => navigate('cleaner-home')} notifs={cleanerNotifs} setNotifs={setCleanerNotifs} />;
      case 'cleaner-profile': return <CleanerProfile onBack={() => navigate('cleaner-home')} currentUser={currentUser} onLogout={handleLogout} />;
      case 'cleaner-leave': return <CleanerLeave onBack={() => navigate('cleaner-home')} currentUser={currentUser} />;
      case 'admin-home': return <AdminOverview onNavigate={navigate} currentUser={currentUser} onLogout={handleLogout} currentScreen={screen} />;
      case 'admin-users': return <AdminUsers onBack={() => navigate('admin-home')} />;
      case 'admin-classes': return <AdminClasses onBack={() => navigate('admin-home')} currentUser={currentUser} onNavigate={navigate} />;
      case 'admin-student-qr': return <AdminStudentQR onBack={() => navigate('admin-classes')} currentUser={currentUser} />;
      case 'admin-buses': return <AdminBuses onBack={() => navigate('admin-home')} currentUser={currentUser} />;
      case 'admin-reports': return <AdminReports onBack={() => navigate('admin-home')} />;
      case 'admin-alerts': return <AdminAlerts onBack={() => navigate('admin-home')} />;
      case 'admin-activities': return <AdminActivities onBack={() => navigate('admin-home')} currentUser={currentUser} />;
      case 'admin-settings': return <AdminSettings onBack={() => navigate('admin-home')} currentUser={currentUser} />;
      case 'admin-leaves': return <AdminLeaveScreen onBack={() => navigate('admin-home')} currentUser={currentUser} />;
      case 'admin-fees': return <AdminFeeScreen onBack={() => navigate('admin-home')} currentUser={currentUser} />;
    case 'admin-salary': return <AdminSalaryScreen onBack={() => navigate('admin-home')} />;
    case 'admin-promotion': return <AdminPromotion onBack={() => navigate('admin-home')} />;
    case 'admin-fee-status': return <AdminFeeStatus onBack={() => navigate('admin-home')} />;
    case 'admin-students': return <AdminStudents onBack={() => navigate('admin-classes')} classItem={currentUser?.selectedClass} />;
    case 'admin-profile': return <AdminProfile onBack={() => navigate('admin-home')} currentUser={currentUser} onLogout={handleLogout} onUpdateUser={(u) => setCurrentUser(u)} />;
    case 'admin-send-document': return <AdminSendDocument onBack={() => navigate('admin-home')} currentUser={currentUser} />;
      default: return null;
    }
  };

  const showNav = isParentHome || isTeacherHome || isDriverHome || isCleanerHome || isAdminHome;
  const tabs = isParentHome ? parentTabs : isAdminHome ? adminTabs : isDriverHome ? driverTabs : isCleanerHome ? cleanerTabs : teacherTabs;
  const activeColor = isAdminHome ? C.purple : isDriverHome ? C.teal : isCleanerHome ? C.gold : C.gold;

  const isWeb = Platform.OS === 'web';

  const webContainerStyle = showNav
    ? { width: 390, height: 844, backgroundColor: C.navy, borderRadius: 40, overflow: 'hidden', alignSelf: 'center' }
    : { width: 390, minHeight: 844, backgroundColor: C.navy, borderRadius: 40, overflow: 'hidden', alignSelf: 'center' };

  const content = (
    <View style={isWeb ? webContainerStyle : { flex: 1, backgroundColor: C.navy }}>
      {showNav && (
        <View style={S.statusbar}>
          <Text style={{ fontSize: 13, fontWeight: '600', color: C.white }}>9:41</Text>
          <Text style={{ fontSize: 12, color: C.white }}>{'\u{1F4F6}'} {'\u{1F50B}'} 84%</Text>
        </View>
      )}

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }}>
        <React.Fragment key={screen}>
          {renderScreen()}
        </React.Fragment>
      </ScrollView>

      {showNav && (
        <View style={[S.bottomNav, { flexShrink: 0 }]}>
          {tabs.map(t => {
            const isActive = screen === t.screen;
            const pendingLeaveCount = isTeacherHome && t.id === 'alerts'
              ? leaveRequests.filter(r => r.status === 'Pending').length
              : 0;
            return (
              <TouchableOpacity key={t.id} style={[S.navItem, { position: 'relative' }]} onPress={() => navigate(t.screen)}>
                {pendingLeaveCount > 0 && (
                  <View style={{ position: 'absolute', top: 0, right: 4, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: C.coral, borderWidth: 2, borderColor: C.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3, zIndex: 10 }}>
                    <Text style={{ fontSize: 8, fontWeight: '800', color: C.white }}>{pendingLeaveCount}</Text>
                  </View>
                )}
                <Icon name={t.icon} size={22} color={isActive ? activeColor : C.muted} />
                <Text style={isActive ? [S.navItemLabelActive, { color: activeColor }] : S.navItemLabel}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );

  const appContent = isWeb ? (
    <View style={{ flex: 1, backgroundColor: '#050F1E', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 }}>
      <OfflineBanner />
      {content}
    </View>
  ) : (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.navy }}>
      <StatusBar barStyle="light-content" backgroundColor={C.navy} />
      <OfflineBanner />
      {content}
    </SafeAreaView>
  );

  return (
    <ErrorBoundary onReset={() => {
      setScreen('splash-intro');
      setCurrentUser(null);
      setRole(null);
    }}>
      {appContent}
    </ErrorBoundary>
  );
}
