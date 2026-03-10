import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Vibration, ScrollView
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { C } from '../../theme/colors';
import { apiFetch } from '../../api/client';
import LoadingSpinner from '../../components/LoadingSpinner';
import { getFriendlyError } from '../../utils/errorMessages';

export default function CleanerScanner({ currentUser, onBack }) {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanHistory, setScanHistory] = useState([]);
  const [torchOn, setTorchOn] = useState(false);
  const lastScanned = useRef('');
  const cooldown = useRef(false);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    if (cooldown.current || data === lastScanned.current) return;
    cooldown.current = true;
    lastScanned.current = data;
    setScanning(true);
    setScanResult(null);
    Vibration.vibrate(100);

    try {
      const res = await apiFetch('/trip/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-role-id': currentUser?.roleId || currentUser?.role_id || ''
        },
        body: JSON.stringify({
          qrData: data,
          driverId: currentUser?.driverId || currentUser?.roleId || '',
          busId: currentUser?.busId || currentUser?.bus_number || '',
          scannedBy: currentUser?.roleId || currentUser?.role_id || '',
          role: 'cleaner',
          timestamp: new Date().toISOString()
        })
      });

      const result = await res.json();

      const entry = {
        id: Date.now(),
        studentName: result.studentName || 'Unknown',
        studentClass: result.studentClass || '',
        scanType: result.scanType || 'board',
        isWrongBus: result.isWrongBus || false,
        success: res.ok,
        error: result.error || null,
        message: result.message || '',
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };

      setScanResult(entry);
      setScanHistory(prev => [entry, ...prev.slice(0, 9)]);
    } catch (err) {
      const entry = {
        id: Date.now(),
        success: false,
        error: getFriendlyError(err, 'Network error. Please try again.'),
        time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
      };
      setScanResult(entry);
    } finally {
      setScanning(false);
      setTimeout(() => {
        cooldown.current = false;
        lastScanned.current = '';
      }, 3000);
    }
  };

  if (hasPermission === null) {
    return (
      <LoadingSpinner fullScreen message="Requesting camera permission..." />
    );
  }

  if (hasPermission === false) {
    return (
      <View style={styles.center}>
        <Text style={{ fontSize: 40, marginBottom: 16 }}>📷</Text>
        <Text style={{ color: C.white, fontWeight: '700', fontSize: 16, marginBottom: 8 }}>Camera Permission Denied</Text>
        <Text style={{ color: C.muted, fontSize: 13, textAlign: 'center', paddingHorizontal: 32 }}>
          Please enable camera access in your device settings to scan student QR codes.
        </Text>
      </View>
    );
  }

  const getBorderColor = () => {
    if (!scanResult) return C.teal;
    if (scanResult.isWrongBus) return C.gold;
    if (scanResult.success) return C.teal;
    return C.coral;
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.navy }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingTop: 24 }}>
        <View>
          <Text style={{ color: C.white, fontWeight: '700', fontSize: 18 }}>QR Scanner</Text>
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Scan student boarding QR codes</Text>
        </View>
        <TouchableOpacity
          onPress={() => setTorchOn(t => !t)}
          style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: torchOn ? C.gold + '33' : C.card, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: torchOn ? C.gold : C.border }}
        >
          <Text style={{ fontSize: 18 }}>{torchOn ? '🔦' : '💡'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ marginHorizontal: 20, borderRadius: 20, overflow: 'hidden', height: 280, borderWidth: 2, borderColor: getBorderColor() }}>
        <CameraView
          style={{ flex: 1 }}
          facing="back"
          enableTorch={torchOn}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={scanning ? undefined : handleBarCodeScanned}
        />

        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />

        {scanning && (
          <View style={styles.scanningOverlay}>
            <ActivityIndicator size="large" color={C.teal} />
            <Text style={{ color: C.white, marginTop: 8, fontWeight: '600' }}>Processing...</Text>
          </View>
        )}
      </View>

      <Text style={{ color: C.muted, textAlign: 'center', fontSize: 12, marginTop: 10 }}>
        Point camera at student QR code to scan
      </Text>

      {scanResult && (
        <View style={{
          marginHorizontal: 20,
          marginTop: 14,
          borderRadius: 14,
          padding: 14,
          backgroundColor: scanResult.isWrongBus ? '#FF990022' : scanResult.success ? C.teal + '22' : C.coral + '22',
          borderWidth: 1,
          borderColor: scanResult.isWrongBus ? C.gold : scanResult.success ? C.teal : C.coral
        }}>
          <Text style={{
            color: scanResult.isWrongBus ? C.gold : scanResult.success ? C.teal : C.coral,
            fontWeight: '700',
            fontSize: 15
          }}>
            {scanResult.isWrongBus ? '⚠️ Wrong Bus Alert!' : scanResult.success ? `✅ ${scanResult.scanType === 'board' ? 'Boarded' : 'Arrived'}` : '❌ Scan Failed'}
          </Text>
          {scanResult.studentName && (
            <Text style={{ color: C.white, fontSize: 14, marginTop: 4 }}>
              {scanResult.studentName}
              {scanResult.studentClass ? ` · ${scanResult.studentClass}` : ''}
            </Text>
          )}
          <Text style={{ color: C.muted, fontSize: 12, marginTop: 3 }}>
            {scanResult.message || scanResult.error}
          </Text>
        </View>
      )}

      {scanHistory.length > 0 && (
        <View style={{ marginHorizontal: 20, marginTop: 16 }}>
          <Text style={{ color: C.muted, fontSize: 12, marginBottom: 8, fontWeight: '600', letterSpacing: 0.5 }}>TODAY'S SCANS</Text>
          <ScrollView style={{ maxHeight: 160 }}>
            {scanHistory.map((entry, i) => (
              <View key={entry.id} style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingVertical: 8,
                borderBottomWidth: i < scanHistory.length - 1 ? 1 : 0,
                borderBottomColor: C.border
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: entry.success ? C.white : C.muted, fontSize: 13, fontWeight: '600' }}>
                    {entry.isWrongBus ? '⚠️ ' : entry.success ? (entry.scanType === 'board' ? '🚌 ' : '🏫 ') : '❌ '}
                    {entry.studentName || 'Unknown'}
                  </Text>
                  {entry.studentClass ? (
                    <Text style={{ color: C.muted, fontSize: 11 }}>{entry.studentClass}</Text>
                  ) : null}
                </View>
                <Text style={{ color: C.muted, fontSize: 11 }}>{entry.time}</Text>
              </View>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    backgroundColor: C.navy,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#00000088',
    alignItems: 'center',
    justifyContent: 'center'
  },
  cornerTL: { position: 'absolute', top: 16, left: 16, width: 24, height: 24, borderTopWidth: 3, borderLeftWidth: 3, borderColor: C.teal, borderRadius: 2 },
  cornerTR: { position: 'absolute', top: 16, right: 16, width: 24, height: 24, borderTopWidth: 3, borderRightWidth: 3, borderColor: C.teal, borderRadius: 2 },
  cornerBL: { position: 'absolute', bottom: 16, left: 16, width: 24, height: 24, borderBottomWidth: 3, borderLeftWidth: 3, borderColor: C.teal, borderRadius: 2 },
  cornerBR: { position: 'absolute', bottom: 16, right: 16, width: 24, height: 24, borderBottomWidth: 3, borderRightWidth: 3, borderColor: C.teal, borderRadius: 2 },
});
