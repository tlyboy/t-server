/*
 Navicat Premium Dump SQL

 Source Server         : 47.99.66.165_3306
 Source Server Type    : MySQL
 Source Server Version : 80100 (8.1.0)
 Source Host           : 47.99.66.165:3306
 Source Schema         : t_server

 Target Server Type    : MySQL
 Target Server Version : 80100 (8.1.0)
 File Encoding         : 65001

 Date: 15/01/2026 13:26:34
*/

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------
-- Table structure for chat_invites
-- ----------------------------
DROP TABLE IF EXISTS `chat_invites`;
CREATE TABLE `chat_invites` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chatId` int NOT NULL,
  `inviterId` int NOT NULL,
  `inviteeId` int NOT NULL,
  `status` enum('pending','accepted','rejected') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `processedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_chat_invites_chatId` (`chatId`),
  KEY `idx_chat_invites_inviteeId` (`inviteeId`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for chat_members
-- ----------------------------
DROP TABLE IF EXISTS `chat_members`;
CREATE TABLE `chat_members` (
  `id` int NOT NULL AUTO_INCREMENT,
  `chatId` int NOT NULL,
  `userId` int NOT NULL,
  `role` enum('owner','admin','member') DEFAULT 'member',
  `joinedAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_chat_user` (`chatId`,`userId`),
  KEY `idx_chat_members_chatId` (`chatId`),
  KEY `idx_chat_members_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for chats
-- ----------------------------
DROP TABLE IF EXISTS `chats`;
CREATE TABLE `chats` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `messageId` int DEFAULT NULL,
  `title` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `updatedAt` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `participantId` int DEFAULT NULL,
  `type` enum('private','group') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'private',
  `avatar` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_chats_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for files
-- ----------------------------
DROP TABLE IF EXISTS `files`;
CREATE TABLE `files` (
  `id` int NOT NULL AUTO_INCREMENT,
  `filename` varchar(255) NOT NULL COMMENT '存储的文件名 (UUID)',
  `originalName` varchar(255) NOT NULL COMMENT '原始文件名',
  `mimeType` varchar(100) NOT NULL DEFAULT 'application/octet-stream',
  `size` int NOT NULL COMMENT '文件大小 (字节)',
  `x` float NOT NULL COMMENT 'X 位置 (百分比 0-100)',
  `y` float NOT NULL COMMENT 'Y 位置 (百分比 0-100)',
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `pickupCode` varchar(6) DEFAULT NULL COMMENT '6位数字取件码',
  `requirePickupCode` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否需要取件码才能下载: 0=否, 1=是',
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_pickupCode` (`pickupCode`),
  KEY `idx_created` (`createdAt`)
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ----------------------------
-- Table structure for friends
-- ----------------------------
DROP TABLE IF EXISTS `friends`;
CREATE TABLE `friends` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `friendId` int DEFAULT NULL,
  `status` enum('pending','accepted','rejected','blocked') CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_friends_userId` (`userId`),
  KEY `idx_friends_friendId` (`friendId`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for messages
-- ----------------------------
DROP TABLE IF EXISTS `messages`;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int DEFAULT NULL,
  `chatId` int DEFAULT NULL,
  `role` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `content` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `encrypted` tinyint(1) DEFAULT '0' COMMENT '是否加密: 0=明文, 1=加密',
  PRIMARY KEY (`id`) USING BTREE,
  KEY `idx_messages_chatId` (`chatId`),
  KEY `idx_messages_userId` (`userId`)
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

-- ----------------------------
-- Table structure for refresh_tokens
-- ----------------------------
DROP TABLE IF EXISTS `refresh_tokens`;
CREATE TABLE `refresh_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `userId` int NOT NULL,
  `token` varchar(255) COLLATE utf8mb4_general_ci NOT NULL,
  `expiresAt` datetime NOT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `revokedAt` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_userId` (`userId`),
  KEY `idx_expiresAt` (`expiresAt`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- ----------------------------
-- Table structure for users
-- ----------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `nickname` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `username` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci DEFAULT NULL,
  `createdAt` datetime DEFAULT CURRENT_TIMESTAMP,
  `avatar` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`) USING BTREE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci ROW_FORMAT=DYNAMIC;

SET FOREIGN_KEY_CHECKS = 1;
