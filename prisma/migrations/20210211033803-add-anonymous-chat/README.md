# Migration `20210211033803-add-anonymous-chat`

This migration has been generated by Hien at 2/11/2021, 3:38:03 AM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
ALTER TABLE "public"."Conversation" ADD COLUMN "isAnonymousChat" boolean   NOT NULL DEFAULT false

ALTER TABLE "public"."Message" ADD COLUMN "isAnonymousChat" boolean   NOT NULL DEFAULT false
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration 20210209084057-add-post-images..20210211033803-add-anonymous-chat
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
@@ -289,15 +289,16 @@
   canAccessBackOffice Boolean  @default(false)
 }
 model Conversation {
-  id        String               @id @default(cuid())
-  name      String?
-  members   ConversationMember[]
-  messages  Message[]
-  isHidden  Boolean              @default(true)
-  createdAt DateTime             @default(now())
-  updatedAt DateTime             @default(now()) @updatedAt
+  id              String               @id @default(cuid())
+  name            String?
+  members         ConversationMember[]
+  messages        Message[]
+  isHidden        Boolean              @default(true)
+  isAnonymousChat Boolean              @default(false)
+  createdAt       DateTime             @default(now())
+  updatedAt       DateTime             @default(now()) @updatedAt
 }
 model ConversationMember {
   conversation       Conversation @relation(fields: [conversationId], references: [id])
@@ -326,8 +327,9 @@
   updatedAt               DateTime             @updatedAt
   deletedAt               DateTime?
   lastReadMessageOfMember ConversationMember[]
   MessageAttachment       MessageAttachment[]
+  isAnonymousChat         Boolean              @default(false)
 }
 model MessageAttachment {
   message   Message @relation(fields: [messageId], references: [id])
```


