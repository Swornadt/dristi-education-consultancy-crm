// One place to restyle the whole app. Antd reads these tokens.
export const APP_NAME = 'Study Abroad CRM';
export const APP_SHORT_NAME = 'SA';

export const ROLE_LABELS = {
  admin: 'Admin',
  counselor: 'Counselor',
  front_desk: 'Front desk',
};

export const theme = {
  token: {
    colorPrimary: '#1f5f8b',
    borderRadius: 6,
    colorBgLayout: '#f4f6f8',
  },
  components: {
    Layout: {
      siderBg: '#14263a',
      headerBg: '#ffffff',
      headerPadding: '0 24px',
      triggerBg: '#0f1d2d',
    },
    Menu: {
      darkItemBg: '#14263a',
      darkItemSelectedBg: '#1f5f8b',
      darkItemHoverBg: '#1d3a57',
    },
  },
};
