# Migration `20210209084057-add-post-images`

This migration has been generated by Hien at 2/9/2021, 8:40:57 AM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
ALTER TABLE "public"."File" ADD COLUMN "postId" integer   

ALTER TABLE "public"."File" ADD FOREIGN KEY ("postId")REFERENCES "public"."Post"("id") ON DELETE SET NULL ON UPDATE CASCADE
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration 20210208064956-add-is-incognito-in-comment..20210209084057-add-post-images
--- datamodel.dml
+++ datamodel.dml
@@ -2,9 +2,9 @@
 // learn more about it in the docs: https://pris.ly/d/prisma-schema
 datasource db {
   provider = "postgresql"
-  url = "***"
+  url = "***"
 }
 generator client {
   provider        = "prisma-client-js"
@@ -275,8 +275,10 @@
   messageAttachment MessageAttachment[]
   Message           Message?            @relation(fields: [messageId], references: [id])
   messageId         String?
   userCover         User[]              @relation("cover")
+  Post              Post?               @relation(fields: [postId], references: [id])
+  postId            Int?
 }
 model Role {
   id                  String   @id
@@ -354,8 +356,9 @@
   deletedAt     DateTime?
   createdBy     User            @relation(fields: [createdById], references: [id])
   createdById   String
   UserLikedPost UserLikedPost[]
+  images        File[]
 }
 model UserLikedPost {
   user      User     @relation(fields: [userId], references: [id])
```


