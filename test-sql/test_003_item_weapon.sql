-- Converted from AirSkyBoat MySQL to PostgreSQL
-- Source: item_weapon.sql
-- Filters: "none"
-- Date: 2025-10-13T02:42:50.309Z

DROP TABLE IF EXISTS "item_weapon";
CREATE TABLE "item_weapon" (
"itemId" smallint(5) unsigned NOT NULL DEFAULT '0',
"name" text,
"skill" tinyint(2) unsigned NOT NULL DEFAULT '0',
"subskill" tinyint(2) NOT NULL DEFAULT '0',
"ilvl_skill" smallint(3) NOT NULL DEFAULT '0',
"ilvl_parry" smallint(3) NOT NULL DEFAULT '0',
"ilvl_macc" smallint(3) NOT NULL DEFAULT '0',
"dmgType" int(10) unsigned NOT NULL DEFAULT '0',
"hit" tinyint(1) unsigned NOT NULL DEFAULT '1',
"delay" int(10) NOT NULL DEFAULT '0',
"dmg" int(10) unsigned NOT NULL DEFAULT '0',
"unlock_points" smallint(5) NOT NULL DEFAULT '0',
PRIMARY KEY ("itemId")
) ;
INSERT INTO "item_weapon" VALUES (16385,'cesti',1,0,0,0,0,4,1,528,1,0);
INSERT INTO "item_weapon" VALUES (16386,'lizard_cesti',1,0,0,0,0,4,1,528,2,0);
INSERT INTO "item_weapon" VALUES (16387,'poison_cesti',1,0,0,0,0,4,1,528,3,0);
INSERT INTO "item_weapon" VALUES (16388,'himantes',1,0,0,0,0,4,1,528,4,0);
INSERT INTO "item_weapon" VALUES (16389,'coeurl_cesti',1,0,0,0,0,4,1,528,5,0);
INSERT INTO "item_weapon" VALUES (16390,'bronze_knuckles',1,0,0,0,0,4,1,576,2,0);
INSERT INTO "item_weapon" VALUES (16391,'brass_knuckles',1,0,0,0,0,4,1,576,4,0);
INSERT INTO "item_weapon" VALUES (16392,'metal_knuckles',1,0,0,0,0,4,1,576,6,0);
INSERT INTO "item_weapon" VALUES (16393,'mythril_knuckles',1,0,0,0,0,4,1,576,9,0);
INSERT INTO "item_weapon" VALUES (16394,'dst._knuckles',1,0,0,0,0,4,1,576,12,0);
INSERT INTO "item_weapon" VALUES (16395,'diamond_knuckles',1,0,0,0,0,4,1,576,17,0);
INSERT INTO "item_weapon" VALUES (16396,'koenigs_knuckles',1,0,0,0,0,4,1,576,19,0);
INSERT INTO "item_weapon" VALUES (16397,'behemoth_cesti',1,0,0,0,0,4,1,528,7,0);
INSERT INTO "item_weapon" VALUES (16398,'burning_cesti',1,0,0,0,0,4,1,520,3,0);
INSERT INTO "item_weapon" VALUES (16399,'katars',1,0,0,0,0,4,1,564,8,0);
INSERT INTO "item_weapon" VALUES (16400,'darksteel_katars',1,0,0,0,0,4,1,564,13,0);
INSERT INTO "item_weapon" VALUES (16401,'jamadhars',1,0,0,0,0,4,1,564,14,0);
INSERT INTO "item_weapon" VALUES (16403,'poison_katars',1,0,0,0,0,4,1,564,9,0);
INSERT INTO "item_weapon" VALUES (16404,'venom_katars',1,0,0,0,0,4,1,564,14,0);
INSERT INTO "item_weapon" VALUES (16405,'cat_baghnakhs',1,0,0,0,0,4,1,540,2,0);
INSERT INTO "item_weapon" VALUES (16406,'baghnakhs',1,0,0,0,0,4,1,540,6,0);
INSERT INTO "item_weapon" VALUES (16407,'brass_baghnakhs',1,0,0,0,0,4,1,540,4,0);
INSERT INTO "item_weapon" VALUES (16408,'rune_baghnakhs',1,0,0,0,0,4,1,540,13,0);
INSERT INTO "item_weapon" VALUES (16409,'lynx_baghnakhs',1,0,0,0,0,4,1,510,6,0);
INSERT INTO "item_weapon" VALUES (16410,'psn._baghnakhs',1,0,0,0,0,4,1,540,7,0);
INSERT INTO "item_weapon" VALUES (16411,'claws',1,0,0,0,0,4,1,546,7,0);
INSERT INTO "item_weapon" VALUES (16412,'mythril_claws',1,0,0,0,0,4,1,546,9,0);
INSERT INTO "item_weapon" VALUES (16413,'darksteel_claws',1,0,0,0,0,4,1,546,11,0);
INSERT INTO "item_weapon" VALUES (16414,'cermet_claws',1,0,0,0,0,4,1,531,11,0);
INSERT INTO "item_weapon" VALUES (16416,'dragon_claws',1,0,0,0,0,4,1,546,13,0);