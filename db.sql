DROP TABLE
IF EXISTS `p2pspider`;

CREATE TABLE `p2pspider` (
	`id` INT (11) NOT NULL AUTO_INCREMENT,
	`hash` VARCHAR (64) CHARACTER
SET utf8 COLLATE utf8_general_ci NULL DEFAULT NULL,
 `name` text CHARACTER
SET utf8 COLLATE utf8_general_ci NULL,
 `magnet` text CHARACTER
SET utf8 COLLATE utf8_general_ci NULL,
 `fetched` datetime NULL DEFAULT NULL,
 PRIMARY KEY (`id`)
) ENGINE = INNODB DEFAULT CHARACTER
SET = utf8 COLLATE = utf8_general_ci ROW_FORMAT = COMPACT;

CREATE INDEX p2pspider_hash ON p2pspider (hash);