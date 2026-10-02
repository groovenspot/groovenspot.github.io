import type { User } from "@prisma/client";
import type { Shipper } from "@/lib/checkout";
import { decrypt } from "./crypto";

export function shipperOf(u: User): Shipper {
  return {
    email: u.email,
    firstNameEn: u.firstNameEn,
    lastNameEn: u.lastNameEn,
    address1En: u.address1En,
    address2En: u.address2En,
    cityEn: u.cityEn,
    provinceEn: u.provinceEn,
    zip: u.zip,
    phone: u.phone,
    pccc: decrypt(u.pcccEnc),
    pcccInNote: u.pcccInNote,
  };
}

export const profileComplete = (u: User) => !!(u.firstNameEn && u.lastNameEn && u.address1En && u.cityEn && u.zip && u.phone && u.pcccEnc);
