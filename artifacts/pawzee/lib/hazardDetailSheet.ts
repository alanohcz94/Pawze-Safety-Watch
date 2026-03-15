const MAX_CONFIRM_DISTANCE_M = 10;

export interface HazardSheetStateInput {
  hazard: {
    lat: number;
    lng: number;
    photoUrl: string | null;
    userHasConfirmed: boolean;
  };
  userLat: number | null;
  userLng: number | null;
}

export interface HazardDetailSheetState {
  distance: number | null;
  alreadyConfirmed: boolean;
  canConfirm: boolean;
  hasPhoto: boolean;
  showViewPhotoButton: boolean;
  showPhotoPreview: boolean;
  showAddPhotoCard: boolean;
  showEditPhotoOverlay: boolean;
  photoActionLabel: "Add Photo" | "Edit Photo" | null;
  showConfirmButton: boolean;
  showAlreadyConfirmedButton: boolean;
  showTooFarMessage: boolean;
}

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusM = 6371000;
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

  return earthRadiusM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function buildHazardNavigationUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

export function getHazardDetailSheetState({
  hazard,
  userLat,
  userLng,
}: HazardSheetStateInput): HazardDetailSheetState {
  const distance =
    userLat != null && userLng != null
      ? haversineDistance(userLat, userLng, hazard.lat, hazard.lng)
      : null;
  const alreadyConfirmed = hazard.userHasConfirmed;
  const hasPhoto = Boolean(hazard.photoUrl);
  const canConfirm = distance != null && distance <= MAX_CONFIRM_DISTANCE_M;
  const canEditPhoto = alreadyConfirmed;

  return {
    distance,
    alreadyConfirmed,
    canConfirm,
    hasPhoto,
    showViewPhotoButton: hasPhoto,
    showPhotoPreview: hasPhoto,
    showAddPhotoCard: canEditPhoto && !hasPhoto,
    showEditPhotoOverlay: canEditPhoto && hasPhoto,
    photoActionLabel: canEditPhoto
      ? hasPhoto
        ? "Edit Photo"
        : "Add Photo"
      : null,
    showConfirmButton: !alreadyConfirmed && canConfirm,
    showAlreadyConfirmedButton: alreadyConfirmed,
    showTooFarMessage: !alreadyConfirmed && distance != null && !canConfirm,
  };
}
