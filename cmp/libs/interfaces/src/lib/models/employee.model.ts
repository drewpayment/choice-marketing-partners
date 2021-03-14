

export interface Employee {
  id: number;
  name: string;
  email: string;
  phoneNo: number;
  address: string;
  address2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  isAdmin: boolean;
  isMgr: boolean;
  salesId1?: string;
  salesId2?: string;
  salesId3?: string;
  hiddenPayroll: boolean;
  deletedAt?: Date;
}
