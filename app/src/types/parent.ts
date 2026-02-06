export interface ParentProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  suburb: string;
  currentNannyId?: string;
}

export interface ChildInfo {
  id: string;
  ageInMonths: number;
  specialNeeds?: string;
}
