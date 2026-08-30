import { wrapRoleObjectText } from './wrapText.js';

export function getObjectRole(obj) {
  return obj?.dataRole || obj?.data?.dataRole || obj?.data?.role || null;
}

export function applyParticipantToDesign(designJson, participant) {
  const json = structuredClone(designJson);
  const objects = json.objects || [];

  const setRoleText = (role, value, fallbackText) => {
    let target = objects.find((obj) => getObjectRole(obj) === role);
    if (!target) {
      target = objects.find((obj) => (obj.text || '') === fallbackText);
    }
    if (target) {
      wrapRoleObjectText(target, value || '');
      if (!getObjectRole(target)) {
        target.dataRole = role;
      }
    }
  };

  setRoleText('name', participant.name, 'Name');
  setRoleText('institution', participant.institution, 'Institution');
  return json;
}

export function restoreObjectRoles(liveObjects, jsonObjects = []) {
  liveObjects.forEach((obj, index) => {
    const fromJson = getObjectRole(jsonObjects[index]);
    if (fromJson) {
      obj.set('dataRole', fromJson);
    }
  });

  const roles = new Set(liveObjects.map(getObjectRole).filter(Boolean));
  if (!roles.has('name')) {
    const nameObj = liveObjects.find((obj) => (obj.text || '') === 'Name');
    if (nameObj) nameObj.set('dataRole', 'name');
  }
  if (!roles.has('institution')) {
    const instObj = liveObjects.find((obj) => (obj.text || '') === 'Institution');
    if (instObj) instObj.set('dataRole', 'institution');
  }
}
