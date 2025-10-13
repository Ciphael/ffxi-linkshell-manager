-- Converted from AirSkyBoat MySQL to PostgreSQL
-- Source: item_equipment.sql
-- Filters: {"level":"<76","ilevel":"=0"}
-- Date: 2025-10-13T02:42:50.269Z

DROP TABLE IF EXISTS "item_equipment";
CREATE TABLE "item_equipment" (
"itemId" smallint(5) unsigned NOT NULL DEFAULT 0,
"name" tinytext DEFAULT NULL,
"level" tinyint(3) unsigned NOT NULL DEFAULT 0,
"ilevel" tinyint(3) unsigned NOT NULL DEFAULT 0,
"jobs" int(10) unsigned NOT NULL DEFAULT 0,
"MId" smallint(3) unsigned NOT NULL DEFAULT 0,
"shieldSize" tinyint(1) unsigned NOT NULL DEFAULT 0,
"scriptType" smallint(5) unsigned NOT NULL DEFAULT 0,
"slot" smallint(5) unsigned NOT NULL DEFAULT 0,
"rslot" smallint(5) unsigned NOT NULL DEFAULT 0,
"su_level" tinyint(3) unsigned NOT NULL DEFAULT 0,
"race" tinyint(3) unsigned NOT NULL DEFAULT 255,
PRIMARY KEY ("itemId")
) ;
INSERT INTO "item_equipment" VALUES (10250,'moogle_suit',1,0,4194303,307,0,3,32,448,0,255);
INSERT INTO "item_equipment" VALUES (10251,'decennial_coat',1,0,4194303,331,0,0,32,64,0,149);
INSERT INTO "item_equipment" VALUES (10252,'decennial_dress',1,0,4194303,332,0,0,32,64,0,106);
INSERT INTO "item_equipment" VALUES (10253,'decennial_coat_+1',1,0,4194303,331,0,0,32,64,0,149);
INSERT INTO "item_equipment" VALUES (10254,'decennial_dress_+1',1,0,4194303,332,0,0,32,64,0,106);
INSERT INTO "item_equipment" VALUES (10256,'marine_gilet',1,0,4194303,334,0,0,32,64,0,1);
INSERT INTO "item_equipment" VALUES (10257,'marine_top',1,0,4194303,334,0,0,32,64,0,2);
INSERT INTO "item_equipment" VALUES (10258,'woodsy_gilet',1,0,4194303,334,0,0,32,64,0,4);
INSERT INTO "item_equipment" VALUES (10259,'woodsy_top',1,0,4194303,334,0,0,32,64,0,8);
INSERT INTO "item_equipment" VALUES (10260,'creek_maillot',1,0,4194303,334,0,0,32,64,0,16);
INSERT INTO "item_equipment" VALUES (10261,'creek_top',1,0,4194303,335,0,0,32,64,0,32);
INSERT INTO "item_equipment" VALUES (10262,'river_top',1,0,4194303,334,0,0,32,64,0,64);
INSERT INTO "item_equipment" VALUES (10263,'dune_gilet',1,0,4194303,334,0,0,32,64,0,128);
INSERT INTO "item_equipment" VALUES (10264,'marine_gilet_+1',1,0,4194303,334,0,0,32,64,0,1);
INSERT INTO "item_equipment" VALUES (10265,'marine_top_+1',1,0,4194303,334,0,0,32,64,0,2);
INSERT INTO "item_equipment" VALUES (10266,'woodsy_gilet_+1',1,0,4194303,334,0,0,32,64,0,4);
INSERT INTO "item_equipment" VALUES (10267,'woodsy_top_+1',1,0,4194303,334,0,0,32,64,0,8);
INSERT INTO "item_equipment" VALUES (10268,'creek_maillot_+1',1,0,4194303,334,0,0,32,64,0,16);
INSERT INTO "item_equipment" VALUES (10269,'creek_top_+1',1,0,4194303,335,0,0,32,64,0,32);
INSERT INTO "item_equipment" VALUES (10270,'river_top_+1',1,0,4194303,334,0,0,32,64,0,64);
INSERT INTO "item_equipment" VALUES (10271,'dune_gilet_+1',1,0,4194303,334,0,0,32,64,0,128);
INSERT INTO "item_equipment" VALUES (10293,'chocobo_shirt',1,0,4194303,309,0,0,32,0,0,255);
INSERT INTO "item_equipment" VALUES (10330,'marine_boxers',1,0,4194303,334,0,0,128,256,0,1);
INSERT INTO "item_equipment" VALUES (10331,'marine_shorts',1,0,4194303,334,0,0,128,256,0,2);
INSERT INTO "item_equipment" VALUES (10332,'woodsy_boxers',1,0,4194303,334,0,0,128,256,0,4);
INSERT INTO "item_equipment" VALUES (10333,'woodsy_shorts',1,0,4194303,334,0,0,128,256,0,8);
INSERT INTO "item_equipment" VALUES (10334,'creek_boxers',1,0,4194303,334,0,0,128,256,0,16);
INSERT INTO "item_equipment" VALUES (10335,'creek_shorts',1,0,4194303,335,0,0,128,256,0,32);
INSERT INTO "item_equipment" VALUES (10336,'river_shorts',1,0,4194303,334,0,0,128,256,0,64);
INSERT INTO "item_equipment" VALUES (10337,'dune_boxers',1,0,4194303,334,0,0,128,256,0,128);
INSERT INTO "item_equipment" VALUES (10338,'marine_boxers_+1',1,0,4194303,334,0,0,128,256,0,1);
INSERT INTO "item_equipment" VALUES (10339,'marine_shorts_+1',1,0,4194303,334,0,0,128,256,0,2);
INSERT INTO "item_equipment" VALUES (10340,'woodsy_boxers_+1',1,0,4194303,334,0,0,128,256,0,4);
INSERT INTO "item_equipment" VALUES (10341,'woodsy_shorts_+1',1,0,4194303,334,0,0,128,256,0,8);
INSERT INTO "item_equipment" VALUES (10342,'creek_boxers_+1',1,0,4194303,334,0,0,128,256,0,16);
INSERT INTO "item_equipment" VALUES (10343,'creek_shorts_+1',1,0,4194303,335,0,0,128,256,0,32);
INSERT INTO "item_equipment" VALUES (10344,'river_shorts_+1',1,0,4194303,334,0,0,128,256,0,64);
INSERT INTO "item_equipment" VALUES (10345,'dune_boxers_+1',1,0,4194303,334,0,0,128,256,0,128);
INSERT INTO "item_equipment" VALUES (10382,'dream_mittens',1,0,4194303,122,0,0,64,0,0,255);
INSERT INTO "item_equipment" VALUES (10383,'dream_mittens_+1',1,0,4194303,122,0,0,64,0,0,255);
INSERT INTO "item_equipment" VALUES (10384,'cumulus_masque',1,0,4194303,388,0,0,16,0,0,255);
INSERT INTO "item_equipment" VALUES (10385,'cumulus_masque_+1',1,0,4194303,388,0,0,16,0,0,255);
INSERT INTO "item_equipment" VALUES (10429,'moogle_masque',1,0,4194303,307,0,0,16,0,0,255);
INSERT INTO "item_equipment" VALUES (10430,'decennial_crown',1,0,4194303,331,0,0,16,0,0,149);
INSERT INTO "item_equipment" VALUES (10431,'decennial_tiara',1,0,4194303,332,0,0,16,0,0,106);
INSERT INTO "item_equipment" VALUES (10432,'decennial_crown_+1',1,0,4194303,331,0,0,16,0,0,149);
INSERT INTO "item_equipment" VALUES (10433,'decennial_tiara_+1',1,0,4194303,332,0,0,16,0,0,106);
INSERT INTO "item_equipment" VALUES (10446,'ahriman_cap',1,0,4194303,328,0,0,16,0,0,255);
INSERT INTO "item_equipment" VALUES (10447,'pyracmon_cap',1,0,4194303,328,0,0,16,0,0,255);
INSERT INTO "item_equipment" VALUES (10593,'decennial_tights',1,0,4194303,331,0,0,128,256,0,149);