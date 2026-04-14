import { StyleSheet, Platform } from 'react-native';
import { C } from './colors';

export const S = StyleSheet.create({
  app: {
    width: 390,
    minHeight: 844,
    backgroundColor: C.navy,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 40,
    alignSelf: 'center',
  },
  statusbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 14,
    paddingBottom: 8,
    paddingHorizontal: 24,
  },
  bottomNav: {
    backgroundColor: C.navyMid,
    borderTopWidth: 1,
    borderTopColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 20,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  navItemLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: C.muted,
  },
  navItemLabelActive: {
    fontSize: 10,
    fontWeight: '500',
  },
  card: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 20,
    padding: 20,
  },
  cardSm: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
  },
  btnGold: {
    backgroundColor: C.gold,
  },
  btnTeal: {
    backgroundColor: C.teal,
  },
  btnOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  btnPurple: {
    backgroundColor: C.purple,
  },
  btnFull: {
    width: '100%',
  },
  btnText: {
    fontWeight: '600',
    fontSize: 15,
  },
  btnTextDark: {
    color: C.navy,
    fontWeight: '600',
    fontSize: 15,
  },
  btnTextLight: {
    color: C.white,
    fontWeight: '600',
    fontSize: 15,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 50,
  },
  chipGold: {
    backgroundColor: 'rgba(232,162,26,0.15)',
  },
  chipTeal: {
    backgroundColor: 'rgba(0,184,169,0.15)',
  },
  chipCoral: {
    backgroundColor: 'rgba(255,107,107,0.15)',
  },
  chipGreen: {
    backgroundColor: 'rgba(52,211,153,0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    backgroundColor: C.border,
    borderRadius: 99,
    height: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 99,
  },
  secHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  secTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.white,
  },
  secLink: {
    fontSize: 13,
    color: C.gold,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontWeight: '700',
    fontSize: 16,
  },
  loginBg: {
    minHeight: 844,
    position: 'relative',
    overflow: 'hidden',
  },
  inputField: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: C.navyMid,
    borderWidth: 1.5,
    borderColor: C.border,
    color: C.white,
    fontSize: 15,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
    color: C.muted,
    marginBottom: 8,
  },
  toggleWrap: {
    flexDirection: 'row',
    backgroundColor: C.navyMid,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 9,
    alignItems: 'center',
  },
  toggleBtnActive: {
    backgroundColor: C.gold,
  },
  toggleBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  toggleBtnTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: C.navy,
  },
  pageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricCard: {
    flex: 1,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  busCard: {
    borderWidth: 1,
    borderColor: C.teal + '44',
    borderRadius: 20,
    padding: 20,
  },
  notifItem: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    height: 100,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  barLabel: {
    fontSize: 10,
    color: C.muted,
    textAlign: 'center',
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 16,
    marginBottom: 10,
  },
  attGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  attDay: {
    width: '13%',
    aspectRatio: 1,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#34D399',
  },
  scrollArea: {
    paddingHorizontal: 0,
  },
});

export const INR = (n) => '₹' + n.toLocaleString('en-IN');

export const FEE_STATUS_COLOR = (s) =>
  s === 'Paid' ? '#34D399' :
  s === 'Partial' ? C.gold :
  s === 'Pending' ? C.coral :
  s === 'Overdue' ? '#EF4444' : C.muted;
