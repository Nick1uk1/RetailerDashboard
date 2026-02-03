-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Retailer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "groupName" TEXT,
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
INSERT INTO "new_Retailer" ("active", "code", "contactEmail", "createdAt", "groupName", "id", "name", "updatedAt") SELECT "active", "code", "contactEmail", "createdAt", "groupName", "id", "name", "updatedAt" FROM "Retailer";
DROP TABLE "Retailer";
ALTER TABLE "new_Retailer" RENAME TO "Retailer";
CREATE UNIQUE INDEX "Retailer_code_key" ON "Retailer"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
