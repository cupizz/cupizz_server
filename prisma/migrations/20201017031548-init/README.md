# Migration `20201017031548-init`

This migration has been generated at 10/17/2020, 3:15:48 AM.
You can check out the [state of the schema](./schema.prisma) after the migration.

## Database Steps

```sql
CREATE TABLE "public"."User" (
"id" text   NOT NULL ,
"password" text   ,
"nickName" text   NOT NULL ,
"introduction" text   ,
"birthday" timestamp(3)   ,
"gender" "Gender"  ,
"phoneNumber" text   ,
"job" text   ,
"height" integer   ,
"privateFields" "PrivateField"[]  ,
"minAgePrefer" integer   ,
"maxAgePrefer" integer   ,
"minHeightPrefer" integer   ,
"maxHeightPrefer" integer   ,
"genderPrefer" "Gender"[]  ,
"distancePrefer" integer   ,
"mustHaveFields" "MustHaveField"[]  ,
"allowMatching" boolean   NOT NULL DEFAULT true,
"isPrivate" boolean   NOT NULL DEFAULT false,
"showActive" boolean   NOT NULL DEFAULT true,
"avatarId" text   ,
"roleId" text   NOT NULL ,
"onlineStatus" "OnlineStatus"  NOT NULL DEFAULT E'offline',
"lastOnline" timestamp(3)   ,
"updatedAt" timestamp(3)   NOT NULL ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"deletedAt" timestamp(3)   ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."UserDeviceToken" (
"token" text   NOT NULL ,
"deviceId" text   ,
"userId" text   NOT NULL ,
"expireAt" timestamp(3)   NOT NULL ,
PRIMARY KEY ("token")
)

CREATE TABLE "public"."Question" (
"id" text   NOT NULL ,
"content" text   NOT NULL ,
"color" text   NOT NULL ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."UserAnswer" (
"id" text   NOT NULL ,
"questionId" text   NOT NULL ,
"color" text   NOT NULL ,
"content" text   NOT NULL ,
"createById" text   NOT NULL ,
"createAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."UserImage" (
"userId" text   NOT NULL ,
"imageId" text   NOT NULL ,
"userAnswerId" text   ,
PRIMARY KEY ("userId","imageId")
)

CREATE TABLE "public"."SocialProvider" (
"id" text   NOT NULL ,
"type" "SocialProviderType"  NOT NULL ,
"userId" text   NOT NULL ,
"email" text   ,
"phoneNumber" text   ,
"name" text   ,
"avatar" text   ,
"gender" "Gender"  ,
"birthday" timestamp(3)   ,
PRIMARY KEY ("id","type")
)

CREATE TABLE "public"."Friend" (
"senderId" text   NOT NULL ,
"receiverId" text   NOT NULL ,
"sentAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"acceptedAt" timestamp(3)   ,
"isSuperLike" boolean   NOT NULL DEFAULT false,
PRIMARY KEY ("senderId","receiverId")
)

CREATE TABLE "public"."File" (
"id" text   NOT NULL ,
"type" "FileType"  NOT NULL ,
"url" text   NOT NULL ,
"thumbnail" text   ,
"messageId" text   ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Role" (
"id" text   NOT NULL ,
"name" text   NOT NULL ,
"description" text   ,
"permissions" text []  ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Conversation" (
"id" text   NOT NULL ,
"name" text   ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."ConversationMember" (
"conversationId" text   NOT NULL ,
"userId" text   NOT NULL ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"messageId" text   ,
"unreadMessageCount" integer   NOT NULL DEFAULT 0,
"isAdmin" boolean   NOT NULL DEFAULT false,
PRIMARY KEY ("conversationId","userId")
)

CREATE TABLE "public"."Message" (
"id" text   NOT NULL ,
"message" text   NOT NULL ,
"senderId" text   NOT NULL ,
"conversationId" text   NOT NULL ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" timestamp(3)   NOT NULL ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."MessageAttachment" (
"messageId" text   NOT NULL ,
"fileId" text   NOT NULL ,
PRIMARY KEY ("messageId","fileId")
)

CREATE TABLE "public"."PostCategory" (
"id" text   NOT NULL ,
"value" text   NOT NULL ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Post" (
"id" SERIAL,
"categoryId" text   NOT NULL ,
"deletedAt" timestamp(3)   ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Comment" (
"id" text   NOT NULL ,
"index" integer   NOT NULL ,
"parentId" text   ,
"content" text   NOT NULL ,
"postId" integer   NOT NULL ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"deletedAt" timestamp(3)   ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."QnA" (
"id" SERIAL,
"question" text   NOT NULL ,
"answer" text   NOT NULL ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."AppConfig" (
"id" text   NOT NULL ,
"name" text   NOT NULL ,
"description" text   ,
"data" jsonb   NOT NULL ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."DislikedUser" (
"userId" text   NOT NULL ,
"dislikedUserId" text   NOT NULL ,
"dislikedAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
PRIMARY KEY ("userId","dislikedUserId")
)

CREATE TABLE "public"."RecommendableUser" (
"sortOrder" integer   NOT NULL ,
"userId" text   NOT NULL ,
"recommendableUserId" text   NOT NULL ,
PRIMARY KEY ("userId","recommendableUserId")
)

CREATE TABLE "public"."HobbyValue" (
"id" text   NOT NULL ,
"value" text   NOT NULL ,
"isValid" boolean   NOT NULL DEFAULT true,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."_HobbyValueToUser" (
"A" text   NOT NULL ,
"B" text   NOT NULL 
)

CREATE UNIQUE INDEX "UserImage_userAnswerId_unique" ON "public"."UserImage"("userAnswerId")

CREATE UNIQUE INDEX "Comment.postId_index_unique" ON "public"."Comment"("postId", "index")

CREATE UNIQUE INDEX "RecommendableUser.userId_sortOrder_unique" ON "public"."RecommendableUser"("userId", "sortOrder")

CREATE UNIQUE INDEX "_HobbyValueToUser_AB_unique" ON "public"."_HobbyValueToUser"("A", "B")

CREATE INDEX "_HobbyValueToUser_B_index" ON "public"."_HobbyValueToUser"("B")

ALTER TABLE "public"."User" ADD FOREIGN KEY ("avatarId")REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."User" ADD FOREIGN KEY ("roleId")REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserDeviceToken" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserAnswer" ADD FOREIGN KEY ("questionId")REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserAnswer" ADD FOREIGN KEY ("createById")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("imageId")REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("userAnswerId")REFERENCES "public"."UserAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."SocialProvider" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Friend" ADD FOREIGN KEY ("senderId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Friend" ADD FOREIGN KEY ("receiverId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."File" ADD FOREIGN KEY ("messageId")REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."ConversationMember" ADD FOREIGN KEY ("conversationId")REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."ConversationMember" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."ConversationMember" ADD FOREIGN KEY ("messageId")REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."Message" ADD FOREIGN KEY ("senderId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Message" ADD FOREIGN KEY ("conversationId")REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."MessageAttachment" ADD FOREIGN KEY ("messageId")REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."MessageAttachment" ADD FOREIGN KEY ("fileId")REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Post" ADD FOREIGN KEY ("categoryId")REFERENCES "public"."PostCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Comment" ADD FOREIGN KEY ("parentId")REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."Comment" ADD FOREIGN KEY ("postId")REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."DislikedUser" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."DislikedUser" ADD FOREIGN KEY ("dislikedUserId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."RecommendableUser" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."RecommendableUser" ADD FOREIGN KEY ("recommendableUserId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."_HobbyValueToUser" ADD FOREIGN KEY ("A")REFERENCES "public"."HobbyValue"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."_HobbyValueToUser" ADD FOREIGN KEY ("B")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration ..20201017031548-init
--- datamodel.dml
+++ datamodel.dml
@@ -1,0 +1,298 @@
+// This is your Prisma schema file,
+// learn more about it in the docs: https://pris.ly/d/prisma-schema
+
+datasource db {
+  provider = "postgresql"
+  url = "***"
+}
+
+generator client {
+  provider = "prisma-client-js"
+}
+
+enum Gender {
+  male
+  female
+  other
+}
+
+enum FileType {
+  image
+  video
+}
+
+enum SocialProviderType {
+  email
+  facebook
+  google
+  instagram
+}
+
+enum OnlineStatus {
+  online
+  away
+  offline
+}
+
+enum PrivateField {
+  birthday
+  introduction
+  gender
+  hobbies
+  phoneNumber
+  job
+  height
+}
+
+enum MustHaveField {
+  age
+  height
+  distance
+  gender
+}
+
+model User {
+  id                  String               @id @default(uuid())
+  password            String?
+  nickName            String
+  introduction        String?
+  birthday            DateTime?
+  gender              Gender?
+  hobbies             HobbyValue[]
+  phoneNumber         String?
+  job                 String?
+  height              Int?
+  privateFields       PrivateField[]
+  minAgePrefer        Int?
+  maxAgePrefer        Int?
+  minHeightPrefer     Int?
+  maxHeightPrefer     Int?
+  genderPrefer        Gender[]
+  distancePrefer      Int?
+  mustHaveFields      MustHaveField[]
+  allowMatching       Boolean              @default(true)
+  isPrivate           Boolean              @default(false)
+  showActive          Boolean              @default(true)
+  avatar              File?                @relation("avatar", fields: [avatarId], references: [id])
+  avatarId            String?
+  role                Role                 @relation(fields: [roleId], references: [id])
+  roleId              String
+  userImage           UserImage[]
+  senderMessage       Message[]            @relation("senderMessage")
+  socialProvider      SocialProvider[]
+  senderFriend        Friend[]             @relation("senderFriend")
+  receiverFriend      Friend[]             @relation("receiverFriend")
+  onlineStatus        OnlineStatus         @default(offline)
+  lastOnline          DateTime?
+  userAnswer          UserAnswer[]
+  dislikedUsers       DislikedUser[]       @relation("dislikedUser")
+  beDislikedByUsers   DislikedUser[]       @relation("beDislikedByUser")
+  recommendableUser   RecommendableUser[]  @relation("recommendableUser")
+  recommendToUser     RecommendableUser[]  @relation("recommendToUser")
+  conversationMembers ConversationMember[]
+  updatedAt           DateTime             @updatedAt
+  createdAt           DateTime             @default(now())
+  deletedAt           DateTime?
+  userDeviceTokens    UserDeviceToken[]
+}
+
+model UserDeviceToken {
+  token    String   @id
+  user     User     @relation(fields: [userId], references: [id])
+  deviceId String?
+  userId   String
+  expireAt DateTime
+}
+
+model Question {
+  id         String       @id @default(cuid())
+  content    String
+  userAnswer UserAnswer[]
+  color      String
+}
+
+model UserAnswer {
+  id         String     @id @default(cuid())
+  question   Question   @relation(fields: [questionId], references: [id])
+  questionId String
+  color      String
+  content    String
+  createBy   User       @relation(fields: [createById], references: [id])
+  createById String
+  createAt   DateTime   @default(now())
+  userImage  UserImage?
+}
+
+model UserImage {
+  user         User        @relation(fields: [userId], references: [id])
+  image        File        @relation(fields: [imageId], references: [id])
+  userId       String
+  imageId      String
+  userAnswer   UserAnswer? @relation(fields: [userAnswerId], references: [id])
+  userAnswerId String?
+
+  @@id([userId, imageId])
+}
+
+model SocialProvider {
+  id          String
+  type        SocialProviderType
+  user        User               @relation(fields: [userId], references: [id])
+  userId      String
+  email       String?
+  phoneNumber String?
+  name        String?
+  avatar      String?
+  gender      Gender?
+  birthday    DateTime?
+
+  @@id([id, type])
+}
+
+model Friend {
+  sender      User      @relation("senderFriend", fields: [senderId], references: [id])
+  receiver    User      @relation("receiverFriend", fields: [receiverId], references: [id])
+  senderId    String
+  receiverId  String
+  sentAt      DateTime  @default(now())
+  acceptedAt  DateTime?
+  isSuperLike Boolean   @default(false)
+
+  @@id([senderId, receiverId])
+}
+
+model File {
+  id                String              @id @default(cuid())
+  type              FileType
+  url               String
+  thumbnail         String?
+  userAvatar        User[]              @relation("avatar")
+  userImage         UserImage[]
+  messageAttachment MessageAttachment[]
+  Message           Message?            @relation(fields: [messageId], references: [id])
+  messageId         String?
+}
+
+model Role {
+  id          String   @id
+  name        String
+  description String?
+  permissions String[]
+  user        User[]
+}
+
+model Conversation {
+  id        String               @id @default(cuid())
+  name      String?
+  members   ConversationMember[]
+  messages  Message[]
+  createdAt DateTime             @default(now())
+  updatedAt DateTime             @default(now()) @updatedAt
+}
+
+model ConversationMember {
+  conversation       Conversation @relation(fields: [conversationId], references: [id])
+  conversationId     String
+  user               User         @relation(fields: [userId], references: [id])
+  userId             String
+  createdAt          DateTime     @default(now())
+  lastReadMessage    Message?     @relation(fields: [messageId], references: [id])
+  messageId          String?
+  unreadMessageCount Int          @default(0)
+  isAdmin            Boolean      @default(false)
+
+  @@id([conversationId, userId])
+}
+
+model Message {
+  id                      String               @id @default(cuid())
+  message                 String
+  attachments             File[]
+  sender                  User                 @relation("senderMessage", fields: [senderId], references: [id])
+  senderId                String
+  conversation            Conversation         @relation(fields: [conversationId], references: [id])
+  conversationId          String
+  createdAt               DateTime             @default(now())
+  updatedAt               DateTime             @updatedAt
+  lastReadMessageOfMember ConversationMember[]
+  MessageAttachment       MessageAttachment[]
+}
+
+model MessageAttachment {
+  message   Message @relation(fields: [messageId], references: [id])
+  file      File    @relation(fields: [fileId], references: [id])
+  messageId String
+  fileId    String
+
+  @@id([messageId, fileId])
+}
+
+model PostCategory {
+  id    String @id @default(cuid())
+  value String
+  Post  Post[]
+}
+
+model Post {
+  id         Int          @id @default(autoincrement())
+  category   PostCategory @relation(fields: [categoryId], references: [id])
+  categoryId String
+  comment    Comment[]
+  deletedAt  DateTime?
+}
+
+model Comment {
+  id            String    @id @default(cuid())
+  index         Int
+  parentComment Comment?  @relation("ReplyToComment", fields: [parentId], references: [id])
+  reply         Comment[] @relation("ReplyToComment")
+  parentId      String?
+  content       String
+  post          Post      @relation(fields: [postId], references: [id])
+  postId        Int
+  createdAt     DateTime  @default(now())
+  deletedAt     DateTime?
+
+  @@unique([postId, index])
+}
+
+model QnA {
+  id       Int    @id @default(autoincrement())
+  question String
+  answer   String
+}
+
+model AppConfig {
+  id          String  @id
+  name        String
+  description String?
+  data        Json
+}
+
+model DislikedUser {
+  user           User     @relation("dislikedUser", fields: [userId], references: [id])
+  dislikedUser   User     @relation("beDislikedByUser", fields: [dislikedUserId], references: [id])
+  userId         String
+  dislikedUserId String
+  dislikedAt     DateTime @default(now())
+
+  @@id([userId, dislikedUserId])
+}
+
+model RecommendableUser {
+  sortOrder           Int
+  user                User   @relation("recommendableUser", fields: [userId], references: [id])
+  recommendableUser   User   @relation("recommendToUser", fields: [recommendableUserId], references: [id])
+  userId              String
+  recommendableUserId String
+
+  @@id([userId, recommendableUserId])
+  @@unique([userId, sortOrder])
+}
+
+model HobbyValue {
+  id      String  @id @default(cuid())
+  value   String
+  isValid Boolean @default(true)
+  user    User[]
+}
```


