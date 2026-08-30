import { FabricObject } from 'fabric';

const extras = ['dataRole', 'assetId'];
const existing = FabricObject.customProperties || [];
FabricObject.customProperties = [...new Set([...existing, ...extras])];
