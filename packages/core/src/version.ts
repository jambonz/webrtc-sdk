declare const __PKG_VERSION__: string;

export const VERSION: string = typeof __PKG_VERSION__ !== 'undefined' ? __PKG_VERSION__ : '0.0.0';
export const DEFAULT_USER_AGENT = `jambonz-webrtc-${VERSION}`;
