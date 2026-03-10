import { C } from '../theme/colors';

export const TEACHER_LEAVE_REASONS = [
  { id:"sick", icon:"\u{1F912}", label:"Medical / Sick Leave" },
  { id:"personal", icon:"\u{1F464}", label:"Personal / Family Matter" },
  { id:"travel", icon:"\u2708\uFE0F", label:"Out of Station / Travel" },
  { id:"study", icon:"\u{1F4DA}", label:"Training / Study Leave" },
  { id:"ceremony", icon:"\u{1F38A}", label:"Religious / Ceremony Leave" },
  { id:"other", icon:"\u{1F4DD}", label:"Other (describe below)" },
];

export const CAL_MONTHS_T = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const EVENT_TYPE_META = {
  all:      { icon: "\u{1F4C5}", label: "All",      color: C.gold },
  class:    { icon: "\u{1F4D6}", label: "Class",    color: C.teal },
  exam:     { icon: "\u{1F4DD}", label: "Exam",     color: C.coral },
  revision: { icon: "\u{1F4D6}", label: "Revision", color: "#A78BFA" },
  meeting:  { icon: "\u{1F465}", label: "Meeting",  color: C.purple },
  event:    { icon: "\u{1F3AD}", label: "Event",    color: "#F59E0B" },
  holiday:  { icon: "\u{1F3D6}\uFE0F", label: "Holiday",  color: "#34D399" },
};
