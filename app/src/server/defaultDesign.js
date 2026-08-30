export const BADGE_WIDTH = 1050;
export const BADGE_HEIGHT = 594;

export function createDefaultDesign() {
  return {
    version: '6.6.1',
    objects: [
      {
        type: 'IText',
        left: BADGE_WIDTH / 2,
        top: BADGE_HEIGHT * 0.35,
        originX: 'center',
        originY: 'center',
        text: 'Name',
        fontSize: 48,
        fontFamily: 'Arial',
        fill: '#111111',
        fontWeight: 'bold',
        textAlign: 'center',
        dataRole: 'name',
        data: { role: 'name' },
        selectable: true,
        lockScalingFlip: true,
      },
      {
        type: 'IText',
        left: BADGE_WIDTH / 2,
        top: BADGE_HEIGHT * 0.55,
        originX: 'center',
        originY: 'center',
        text: 'Institution',
        fontSize: 32,
        fontFamily: 'Arial',
        fill: '#333333',
        textAlign: 'center',
        dataRole: 'institution',
        data: { role: 'institution' },
        selectable: true,
        lockScalingFlip: true,
      },
    ],
    background: '#ffffff',
  };
}
