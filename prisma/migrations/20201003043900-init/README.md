# Migration `20201003043900-init`

This migration has been generated by Hieren at 10/3/2020, 4:39:00 AM.
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
"hobbies" text   ,
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
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Role" (
"id" text   NOT NULL ,
"name" text   NOT NULL ,
"description" text   ,
"permissions" text []  ,
PRIMARY KEY ("id")
)

CREATE TABLE "public"."Message" (
"id" text   NOT NULL ,
"message" text   NOT NULL ,
"createdAt" timestamp(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" timestamp(3)   NOT NULL ,
"receivedAt" timestamp(3)   ,
"readAt" timestamp(3)   ,
"senderId" text   NOT NULL ,
"receiverId" text   NOT NULL ,
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

CREATE UNIQUE INDEX "UserImage_userAnswerId_unique" ON "public"."UserImage"("userAnswerId")

CREATE UNIQUE INDEX "Role.id_unique" ON "public"."Role"("id")

CREATE UNIQUE INDEX "Comment.postId_index_unique" ON "public"."Comment"("postId", "index")

ALTER TABLE "public"."User" ADD FOREIGN KEY ("avatarId")REFERENCES "public"."File"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."User" ADD FOREIGN KEY ("roleId")REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserAnswer" ADD FOREIGN KEY ("questionId")REFERENCES "public"."Question"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserAnswer" ADD FOREIGN KEY ("createById")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("imageId")REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."UserImage" ADD FOREIGN KEY ("userAnswerId")REFERENCES "public"."UserAnswer"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."SocialProvider" ADD FOREIGN KEY ("userId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Friend" ADD FOREIGN KEY ("senderId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Friend" ADD FOREIGN KEY ("receiverId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Message" ADD FOREIGN KEY ("senderId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Message" ADD FOREIGN KEY ("receiverId")REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."MessageAttachment" ADD FOREIGN KEY ("messageId")REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."MessageAttachment" ADD FOREIGN KEY ("fileId")REFERENCES "public"."File"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Post" ADD FOREIGN KEY ("categoryId")REFERENCES "public"."PostCategory"("id") ON DELETE CASCADE ON UPDATE CASCADE

ALTER TABLE "public"."Comment" ADD FOREIGN KEY ("parentId")REFERENCES "public"."Comment"("id") ON DELETE SET NULL ON UPDATE CASCADE

ALTER TABLE "public"."Comment" ADD FOREIGN KEY ("postId")REFERENCES "public"."Post"("id") ON DELETE CASCADE ON UPDATE CASCADE
```

## Changes

```diff
diff --git schema.prisma schema.prisma
migration ..20201003043900-init
--- datamodel.dml
+++ datamodel.dml
@@ -1,0 +1,227 @@
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
+  id              String           @default(uuid()) @id
+  password        String?
+  nickName        String
+  introduction    String?
+  birthday        DateTime?
+  gender          Gender?
+  hobbies         String?
+  phoneNumber     String?
+  job             String?
+  height          Int?
+  privateFields   PrivateField[]
+  minAgePrefer    Int?
+  maxAgePrefer    Int?
+  minHeightPrefer Int?
+  maxHeightPrefer Int?
+  genderPrefer    Gender[]
+  distancePrefer  Int?
+  mustHaveFields  MustHaveField[]
+  allowMatching   Boolean          @default(true)
+  isPrivate       Boolean          @default(false)
+  showActive      Boolean          @default(true)
+  avatar          File?            @relation("avatar", fields: [avatarId], references: [id])
+  avatarId        String?
+  role            Role             @relation(fields: [roleId], references: [id])
+  roleId          String
+  userImage       UserImage[]
+  senderMessage   Message[]        @relation("senderMessage")
+  receiverMessage Message[]        @relation("receiverMessage")
+  socialProvider  SocialProvider[]
+  senderFriend    Friend[]         @relation("senderFriend")
+  receiverFriend  Friend[]         @relation("receiverFriend")
+  onlineStatus    OnlineStatus     @default(offline)
+  lastOnline      DateTime?
+  userAnswer      UserAnswer[]
+  updatedAt       DateTime         @updatedAt
+  createdAt       DateTime         @default(now())
+  deletedAt       DateTime?
+}
+
+model Question {
+  id         String       @default(cuid()) @id
+  content    String
+  userAnswer UserAnswer[]
+  color      String
+}
+
+model UserAnswer {
+  id         String     @default(cuid()) @id
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
+  @@id([userId, imageId])
+  user         User        @relation(fields: [userId], references: [id])
+  image        File        @relation(fields: [imageId], references: [id])
+  userId       String
+  imageId      String
+  userAnswer   UserAnswer? @relation(fields: [userAnswerId], references: [id])
+  userAnswerId String?
+}
+
+model SocialProvider {
+  @@id([id, type])
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
+}
+
+model Friend {
+  @@id([senderId, receiverId])
+  sender      User      @relation("senderFriend", fields: [senderId], references: [id])
+  receiver    User      @relation("receiverFriend", fields: [receiverId], references: [id])
+  senderId    String
+  receiverId  String
+  sentAt      DateTime  @default(now())
+  acceptedAt  DateTime?
+  isSuperLike Boolean   @default(false)
+}
+
+model File {
+  id                String              @default(cuid()) @id
+  type              FileType
+  url               String
+  thumbnail         String?
+  userAvatar        User[]              @relation("avatar")
+  userImage         UserImage[]
+  messageAttachment MessageAttachment[]
+}
+
+model Role {
+  id          String   @unique @id
+  name        String
+  description String?
+  permissions String[]
+  user        User[]
+}
+
+model Message {
+  id                String              @default(cuid()) @id
+  message           String
+  createdAt         DateTime            @default(now())
+  updatedAt         DateTime            @updatedAt
+  receivedAt        DateTime?
+  readAt            DateTime?
+  messageAttachment MessageAttachment[]
+  sender            User                @relation("senderMessage", fields: [senderId], references: [id])
+  receiver          User                @relation("receiverMessage", fields: [receiverId], references: [id])
+  senderId          String
+  receiverId        String
+}
+
+model MessageAttachment {
+  @@id([messageId, fileId])
+  message   Message @relation(fields: [messageId], references: [id])
+  file      File    @relation(fields: [fileId], references: [id])
+  messageId String
+  fileId    String
+}
+
+model PostCategory {
+  id    String @default(cuid()) @id
+  value String
+  Post  Post[]
+}
+
+model Post {
+  id         Int          @default(autoincrement()) @id
+  category   PostCategory @relation(fields: [categoryId], references: [id])
+  categoryId String
+  comment    Comment[]
+  deletedAt  DateTime?
+}
+
+model Comment {
+  @@unique([postId, index])
+  id            String    @default(cuid()) @id
+  index         Int
+  parentComment Comment?  @relation("ReplyToComment", fields: [parentId], references: [id])
+  reply         Comment[] @relation("ReplyToComment")
+  parentId      String?
+  content       String
+  post          Post      @relation(fields: [postId], references: [id])
+  postId        Int
+  createdAt     DateTime  @default(now())
+  deletedAt     DateTime?
+}
+
+model QnA {
+  id       Int    @default(autoincrement()) @id
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
```

