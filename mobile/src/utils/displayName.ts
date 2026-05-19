import { PublicUser } from '../types';

export function isPlaceholderName(name: string, userCode: string): boolean {
  return name === `User${userCode.slice(-4)}`;
}

export function getPublicDisplayName(participant: PublicUser | null | undefined): string {
  if (!participant) {
    return 'Unknown';
  }
  if (participant.name && !isPlaceholderName(participant.name, participant.userCode)) {
    return participant.name;
  }
  return 'Unknown';
}
