import dayjs from 'dayjs';
import { INTAKE_TERMS, labelOf } from '../config/leadOptions';

export const formatDate = (value) => (value ? dayjs(value).format('D MMM YYYY') : '-');
export const formatDateTime = (value) => (value ? dayjs(value).format('D MMM YYYY, h:mm A') : '-');
export const formatIntake = (intake) => (intake ? `${labelOf(INTAKE_TERMS, intake.term)} ${intake.year}` : '-');
