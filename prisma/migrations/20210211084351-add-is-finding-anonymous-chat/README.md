# Migration `20210211084351-add-is-finding-anonymous-chat`

This migration has been generated by Hien at 2/11/2021, 8:43:51 AM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
ALTER TYPE "NotificationType" ADD VALUE 'otherFindingAnonymousChat'

ALTER TABLE "public"."User" ADD COLUMN "isFindingAnonymousChat" boolean   NOT NULL DEFAULT false
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration 20210211033803-add-anonymous-chat..20210211084351-add-is-finding-anonymous-chat
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
@@ -65,8 +65,9 @@
 enum NotificationType {
   like
   matching
   newMessage
+  otherFindingAnonymousChat // Thông báo khi có người khác cũng đang tìm người nhắn tin ẩn danh
   other
 }
 enum UserStatus {
@@ -189,8 +190,9 @@
   Post                        Post[]
   remainingSuperLike          Int                    @default(5)
   remainingSuperLikeUpdatedAt DateTime               @default(now())
   UserLikedPost               UserLikedPost[]
+  isFindingAnonymousChat      Boolean                @default(false)
 }
 model UserDeviceToken {
   token    String   @id
```


