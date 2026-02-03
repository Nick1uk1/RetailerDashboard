-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Retailer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "groupName" TEXT,
    "paymentTermsDays" INTEGER NOT NULL DEFAULT 30,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "addressLine3" TEXT,
    "city" TEXT,
    "county" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'United Kingdom',
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Retailer" ("active", "addressLine1", "addressLine2", "addressLine3", "city", "code", "contactEmail", "country", "county", "createdAt", "groupName", "id", "name", "phone", "postcode", "updatedAt") SELECT "active", "addressLine1", "addressLine2", "addressLine3", "city", "code", "contactEmail", "country", "county", "createdAt", "groupName", "id", "name", "phone", "postcode", "updatedAt" FROM "Retailer";
DROP TABLE "Retailer";
ALTER TABLE "new_Retailer" RENAME TO "Retailer";
CREATE UNIQUE INDEX "Retailer_code_key" ON "Retailer"("code");
CREATE TABLE "new_RetailerUser" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "retailerId" TEXT,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'BUYER',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RetailerUser_retailerId_fkey" FOREIGN KEY ("retailerId") REFERENCES "Retailer" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_RetailerUser" ("active", "createdAt", "email", "id", "name", "retailerId", "role", "updatedAt") SELECT "active", "createdAt", "email", "id", "name", "retailerId", "role", "updatedAt" FROM "RetailerUser";
DROP TABLE "RetailerUser";
ALTER TABLE "new_RetailerUser" RENAME TO "RetailerUser";
CREATE UNIQUE INDEX "RetailerUser_email_key" ON "RetailerUser"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
