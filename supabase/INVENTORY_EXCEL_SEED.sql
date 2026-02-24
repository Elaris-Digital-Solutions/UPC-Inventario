BEGIN;


-- Seed generado desde Monterrico.xlsx y San Miguel.xlsx

CREATE TEMP TABLE tmp_inventory_products (
  name text,
  category text,
  description text
);

INSERT INTO tmp_inventory_products(name, category, description) VALUES
('4K 60HZ HDMI','Cables','Lab: MO-UH40 | O.C 115965 CABLE 6.6FT, HIGHWINGS 18GBPS HIGH SPEED HDMI 2.0, BRAIDED CORD- SUPPORTS (4K 60HZ HDR, VIDEO 4K 2160P 1080P 3D HDCP 2.2 ARC-COMPATIBLE WITH ETHERNET MONITOR PS 4/3 HDTV 4K FIRE NETFLIX | Obs: Correcto funcionamiento'),
('AZURC KINCCT DR DEVELOPER KIT','Otros','Lab: MO-UH40 | O.C 115962 / COD. NLN-00001 | Obs: Correcto funcionamiento'),
('DISPLAYPORT CABLE 6.6 FT','Cables','Lab: MO-UH40 | O.C 116160 IVANKY DP CABLE, (UPDATED NEW MODEL) DISPLAYPORT 1.2 CABLE, 4K@60HZ, 2K@165HZ, 2K@144HZ, 3D, DISPLAYPORT TO DISPLAY PORT CABLE 144HZ, COMPATIBLE LAPTOP, PC, GAMING MONITOR, TV | Obs: Correcto funcionamiento'),
('GALAXI S20','Celulares','Lab: MO-UH40 | O.C 115962 CÁMARA POSTERIOR: 12.0MP + 12.0MP + 8.0 MP; CÁMARA FRONTAL: 32MP; PANTALLA: 6.5”; MEMORIA INTERNA: 128GB; PROCESADOR | Obs: Correcto funcionamiento, falta bateria'),
('HFADSET HTC WE COSMOS ELITE','VR','Lab: MO-UH40 | O.C 115964 - VR PN:99HASF006-O | Obs: Sin accesorios'),
('IPAD PRO WI-FI 256GB (AIR)','Tablets','Lab: MO-UH40 | O.C 115963 - SPACE GREY | Obs: Funciona correctamente, falta batería'),
('IPAD PRO WI-FI 512GB','Tablets','Lab: MO-UH40 | O.C 115963 - SPACE GREY | Obs: Funciona correctamente, falta batería'),
('IPHONE 13 MINI - 128GB - AZUL (5.4)','Celulares','Lab: MO-UH40 | IPHONE SE CÓDIGO: MLK43LZ/A | Obs: Correcto funcionamiento, falta bateria'),
('LOGITECH 4K PRO','Cámaras','Lab: MO-UH40 | O.C 115965 MAGNETIC WEBCAM | Obs: Funciona correctamente'),
('OCULUS QUEST 2 ADVANCED ALL- IN-ONE VR HEADER','VR','Lab: MO-UH40 | O.C 115962 ADVANCED ALL-IN-ONE VR HEADSET (128GB, WHITE) | Obs: Correcto funcionamiento, Puntos amarillos en el campo de vision'),
('PROYECTOR 1500 ANCI LUMEN SMART TV','Monitores/TV','Lab: MO-UH40 | O.C 115963 HDR10 LG HF85LA 120 FULL HD | Obs: Correcto funcionamiento, pilas agotadas'),
('SAMSUNG GALAXY TAB S 7 +','Tablets','Lab: MO-UH40 | O.C 115962 WI-FI, MYSTIC BLACK 512GB  COD. SMT970NZKFXAR | Obs: Funciona correctamente, falta batería'),
('STARTECH CABLE CONVERTIDOR','Cables','Lab: MO-UH40 | O.C 116161 DISPLAYPORT A HDMI DE 2M - COLOR NEGOR - ULTRA HD 4K | Obs: Correcto funcionamiento'),
('TABLET GALAXY TAB S6 LITE','Tablets','Lab: MO-UH40 | O.C 115963 COMBO 64 GB WI-FI  SAMSUNG - LITE GRAY + KEYBOARD COVER | Obs: Funciona correctamente, falta batería'),
('Parlante JBL FLIP ESSENTIAL','Audio','Lab: MO-UH40 | Obs: Correcto funcionamiento, falta batería'),
('UGREEN 4K USB-C MULTIFUNCTION ADAPTER 7-IN-1','Cables','Lab: MO-UH40 | Obs: Correcto funcionamiento'),
('4K PRO MAGNETIC WEBCAM','Cámaras','Lab: SM-SB608 | CÁMARA WEB'),
('CABLE BENFEI','Cables','Lab: SM-SB608 | CABLE HDMI DISPLAYPORT'),
('CABLE HIGHWINGS (CORDÓN)','Cables','Lab: SM-SB608 | CABLE HDMI'),
('CABLE IVANKY (PLÁSTICO)','Cables','Lab: SM-SB608 | CABLE HDMI'),
('CABLE STARTECH.COM - 2M/6 SFT','Cables','Lab: SM-SB608 | CABLE HDMI DISPLAYPORT'),
('FLIP ESSENTIAL GUN METAL','Audio','Lab: SM-SB608 | PARLANTE JBL'),
('GALAXY TAB S8+','Tablets','Lab: SM-SB608 | TABLET'),
('HTC VIVE COSMOS ELITE VR HEAD SET','VR','Lab: SM-SB608 | VISOR DE REALIDAD VIRTUAL'),
('IPAD AIR','Tablets','Lab: SM-SB608 | IPAD'),
('IPAD PRO','Tablets','Lab: SM-SB608 | IPAD'),
('IPHONE','Celulares','Lab: SM-SB608 | MOVIL'),
('LG','Periféricos','Lab: SM-SB608 | CONTROL'),
('LG CINE BEAM','Proyectores','Lab: SM-SB608 | PROYECTOR | Obs: Control sin batería'),
('META QUEST2','VR','Lab: SM-SB608 | VISOR DE REALIDAD VIRTUAL'),
('MICROSOFT AZURE KINECT DK','Cámaras','Lab: SM-SB608 | PROYECTOR'),
('SAMSUNG','Periféricos','Lab: SM-SB608 | CONTROL'),
('SAMSUNG GALAXY TAB S8+','Tablets','Lab: SM-SB608 | TABLET | Obs: No carga'),
('SAMSUNG S20 FE','Celulares','Lab: SM-SB608 | MOVIL');

INSERT INTO products(name, price, category, description, main_image, additional_images, featured, in_stock, stock)
SELECT
  t.name,
  0,
  t.category,
  NULLIF(t.description, ''),
  'https://placehold.co/600x400?text=UPC+Inventario',
  '{}',
  false,
  true,
  0
FROM tmp_inventory_products t
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE tmp_inventory_units (
  product_name text,
  product_category text,
  unit_code text,
    campus text,
  asset_code text,
  note text
);

INSERT INTO tmp_inventory_units(product_name, product_category, unit_code, campus, asset_code, note) VALUES
('4k 60hz hdmi','cables','AUTO-mo-uh40-4k-60hz-hdmi-8-01','Monterrico',NULL,'Correcto funcionamiento'),
('4k 60hz hdmi','cables','AUTO-mo-uh40-4k-60hz-hdmi-8-02','Monterrico',NULL,'Correcto funcionamiento'),
('4k 60hz hdmi','cables','AUTO-mo-uh40-4k-60hz-hdmi-8-03','Monterrico',NULL,'Correcto funcionamiento'),
('4k 60hz hdmi','cables','AUTO-mo-uh40-4k-60hz-hdmi-8-04','Monterrico',NULL,'Correcto funcionamiento'),
('azurc kincct dr developer kit','otros','00204863','Monterrico','00204863','Correcto funcionamiento'),
('azurc kincct dr developer kit','otros','00204866','Monterrico','00204866','Correcto funcionamiento'),
('azurc kincct dr developer kit','otros','00204864','Monterrico','00204864','Correcto funcionamiento'),
('azurc kincct dr developer kit','otros','0020485','Monterrico','0020485','Correcto funcionamiento'),
('displayport cable 6.6 ft','cables','AUTO-mo-uh40-displayport-cable-6-6-ft-13-01','Monterrico',NULL,'Correcto funcionamiento'),
('displayport cable 6.6 ft','cables','AUTO-mo-uh40-displayport-cable-6-6-ft-13-02','Monterrico',NULL,'Correcto funcionamiento'),
('displayport cable 6.6 ft','cables','AUTO-mo-uh40-displayport-cable-6-6-ft-13-03','Monterrico',NULL,'Correcto funcionamiento'),
('displayport cable 6.6 ft','cables','AUTO-mo-uh40-displayport-cable-6-6-ft-13-04','Monterrico',NULL,'Correcto funcionamiento'),
('galaxi s20','celulares','00206010','Monterrico','00206010','Correcto funcionamiento, falta bateria'),
('galaxi s20','celulares','00206011','Monterrico','00206011','Correcto funcionamiento, falta bateria'),
('hfadset htc we cosmos elite','vr','00204840','Monterrico','00204840','Sin accesorios'),
('hfadset htc we cosmos elite','vr','00204841','Monterrico','00204841','Sin accesorios'),
('hfadset htc we cosmos elite','vr','00204842','Monterrico','00204842','Sin accesorios'),
('hfadset htc we cosmos elite','vr','00204842-REP02','Monterrico','00204842','Sin accesorios'),
('ipad pro wi-fi 256gb (air)','tablets','00204941','Monterrico','00204941','Funciona correctamente, falta batería'),
('ipad pro wi-fi 256gb (air)','tablets','00204942','Monterrico','00204942','Funciona correctamente, falta batería'),
('ipad pro wi-fi 512gb','tablets','00204940','Monterrico','00204940','Funciona correctamente, falta batería'),
('ipad pro wi-fi 512gb','tablets','00204939','Monterrico','00204939','Funciona correctamente, falta batería'),
('iphone 13 mini - 128gb - azul (5.4)','celulares','0020609','Monterrico','0020609','Correcto funcionamiento, falta bateria'),
('logitech 4k pro','cámaras','AUTO-mo-uh40-logitech-4k-pro-25-01','Monterrico',NULL,'Funciona correctamente'),
('logitech 4k pro','cámaras','AUTO-mo-uh40-logitech-4k-pro-25-02','Monterrico',NULL,'Funciona correctamente'),
('logitech 4k pro','cámaras','AUTO-mo-uh40-logitech-4k-pro-26-01','Monterrico',NULL,'Funciona correctamente'),
('logitech 4k pro','cámaras','AUTO-mo-uh40-logitech-4k-pro-26-02','Monterrico',NULL,'Funciona correctamente'),
('oculus quest 2 advanced all- in-one vr header','vr','00204869','Monterrico','00204869','Correcto funcionamiento, Puntos amarillos en el campo de vision'),
('oculus quest 2 advanced all- in-one vr header','vr','00204870','Monterrico','00204870','Correcto funcionamiento, Soporte del marco de los lentes roto, faltan pilas para los mandos'),
('oculus quest 2 advanced all- in-one vr header','vr','00204867','Monterrico','00204867','Correcto funcionamiento, faltan pilas para los mandos, soporte de lentes faltante'),
('oculus quest 2 advanced all- in-one vr header','vr','00204868','Monterrico','00204868','Correcto funcionamiento, faltan pilas para los mandos'),
('proyector 1500 anci lumen smart tv','monitores/tv','00201923','Monterrico','00201923','Correcto funcionamiento, pilas agotadas'),
('proyector 1500 anci lumen smart tv','monitores/tv','00201924','Monterrico','00201924','Correcto funcionamiento'),
('proyector 1500 anci lumen smart tv','monitores/tv','00209683','Monterrico','00209683','Correcto funcionamiento, pilas agotadas'),
('samsung galaxy tab s 7 +','tablets','00204872','Monterrico','00204872','Funciona correctamente, falta batería'),
('samsung galaxy tab s 7 +','tablets','00204871','Monterrico','00204871','Funciona correctamente, falta batería, clave 123456'),
('startech cable convertidor','cables','AUTO-mo-uh40-startech-cable-convertidor-36-01','Monterrico',NULL,'Correcto funcionamiento'),
('startech cable convertidor','cables','AUTO-mo-uh40-startech-cable-convertidor-36-02','Monterrico',NULL,'Correcto funcionamiento'),
('startech cable convertidor','cables','AUTO-mo-uh40-startech-cable-convertidor-36-03','Monterrico',NULL,'Correcto funcionamiento'),
('startech cable convertidor','cables','AUTO-mo-uh40-startech-cable-convertidor-36-04','Monterrico',NULL,'Correcto funcionamiento'),
('tablet galaxy tab s6 lite','tablets','00201940','Monterrico','00201940','Funciona correctamente, falta batería'),
('tablet galaxy tab s6 lite','tablets','00201941','Monterrico','00201941','Funciona correctamente, falta batería'),
('parlante jbl flip essential','audio','AUTO-mo-uh40-parlante-jbl-flip-essential-39','Monterrico',NULL,'Correcto funcionamiento, falta batería'),
('ugreen 4k usb-c multifunction adapter 7-in-1','cables','AUTO-mo-uh40-ugreen-4k-usb-c-multifunction-adapter-7-in-1-40','Monterrico',NULL,'Correcto funcionamiento'),
('ugreen 4k usb-c multifunction adapter 7-in-1','cables','AUTO-mo-uh40-ugreen-4k-usb-c-multifunction-adapter-7-in-1-41','Monterrico',NULL,'Sellado'),
('ugreen 4k usb-c multifunction adapter 7-in-1','cables','AUTO-mo-uh40-ugreen-4k-usb-c-multifunction-adapter-7-in-1-42','Monterrico',NULL,'Sellado'),
('4k pro magnetic webcam','cámaras','00192921','San Miguel','00192921',NULL),
('4k pro magnetic webcam','cámaras','00192922','San Miguel','00192922',NULL),
('cable benfei','cables','AUTO-sm-sb608-cable-benfei-11-01','San Miguel',NULL,NULL),
('cable benfei','cables','AUTO-sm-sb608-cable-benfei-11-02','San Miguel',NULL,NULL),
('cable highwings (cordón)','cables','AUTO-sm-sb608-cable-highwings-cord-n-12-01','San Miguel',NULL,NULL),
('cable highwings (cordón)','cables','AUTO-sm-sb608-cable-highwings-cord-n-12-02','San Miguel',NULL,NULL),
('cable highwings (cordón)','cables','AUTO-sm-sb608-cable-highwings-cord-n-12-03','San Miguel',NULL,NULL),
('cable highwings (cordón)','cables','AUTO-sm-sb608-cable-highwings-cord-n-12-04','San Miguel',NULL,NULL),
('cable ivanky (plástico)','cables','AUTO-sm-sb608-cable-ivanky-pl-stico-13-01','San Miguel',NULL,NULL),
('cable ivanky (plástico)','cables','AUTO-sm-sb608-cable-ivanky-pl-stico-13-02','San Miguel',NULL,NULL),
('cable startech.com - 2m/6 sft','cables','AUTO-sm-sb608-cable-startech-com-2m-6-sft-14-01','San Miguel',NULL,NULL),
('cable startech.com - 2m/6 sft','cables','AUTO-sm-sb608-cable-startech-com-2m-6-sft-14-02','San Miguel',NULL,NULL),
('cable startech.com - 2m/6 sft','cables','AUTO-sm-sb608-cable-startech-com-2m-6-sft-14-03','San Miguel',NULL,NULL),
('cable startech.com - 2m/6 sft','cables','AUTO-sm-sb608-cable-startech-com-2m-6-sft-14-04','San Miguel',NULL,NULL),
('flip essential gun metal','audio','AUTO-sm-sb608-flip-essential-gun-metal-15-01','San Miguel',NULL,NULL),
('flip essential gun metal','audio','AUTO-sm-sb608-flip-essential-gun-metal-15-02','San Miguel',NULL,NULL),
('galaxy tab s8+','tablets','00192181','San Miguel','00192181',NULL),
('galaxy tab s8+','tablets','00192180','San Miguel','00192180',NULL),
('htc vive cosmos elite vr head set','vr','00192651','San Miguel','00192651',NULL),
('htc vive cosmos elite vr head set','vr','00192650','San Miguel','00192650',NULL),
('htc vive cosmos elite vr head set','vr','00192652','San Miguel','00192652',NULL),
('htc vive cosmos elite vr head set','vr','00192653','San Miguel','00192653',NULL),
('ipad air','tablets','00192166','San Miguel','00192166',NULL),
('ipad air','tablets','00192167','San Miguel','00192167',NULL),
('ipad pro','tablets','00192887','San Miguel','00192887',NULL),
('ipad pro','tablets','00192888','San Miguel','00192888',NULL),
('iphone','celulares','00192889','San Miguel','00192889',NULL),
('iphone','celulares','00192890','San Miguel','00192890',NULL),
('lg','periféricos','AUTO-sm-sb608-lg-28-01','San Miguel',NULL,NULL),
('lg','periféricos','AUTO-sm-sb608-lg-28-02','San Miguel',NULL,NULL),
('lg cine beam','proyectores','00192164','San Miguel','00192164','Control sin batería'),
('lg cine beam','proyectores','00192165','San Miguel','00192165',NULL),
('meta quest2','vr','00192923','San Miguel','00192923',NULL),
('meta quest2','vr','00192184','San Miguel','00192184','Mando izquierdo sin batería'),
('meta quest2','vr','00192183','San Miguel','00192183','Sin batería en los dos mandos'),
('meta quest2','vr','00192182','San Miguel','00192182',NULL),
('microsoft azure kinect dk','cámaras','00192655','San Miguel','00192655',NULL),
('microsoft azure kinect dk','cámaras','00192654','San Miguel','00192654',NULL),
('microsoft azure kinect dk','cámaras','00192884','San Miguel','00192884',NULL),
('microsoft azure kinect dk','cámaras','00192885','San Miguel','00192885',NULL),
('samsung','periféricos','AUTO-sm-sb608-samsung-39-01','San Miguel',NULL,NULL),
('samsung','periféricos','AUTO-sm-sb608-samsung-39-02','San Miguel',NULL,NULL),
('samsung galaxy tab s8+','tablets','00192915','San Miguel','00192915','No carga'),
('samsung galaxy tab s8+','tablets','00192916','San Miguel','00192916',NULL),
('samsung s20 fe','celulares','00192186','San Miguel','00192186',NULL),
('samsung s20 fe','celulares','00192185','San Miguel','00192185',NULL);

INSERT INTO inventory_units(product_id, unit_code, campus, asset_code, current_note)
SELECT p.id, tu.unit_code, tu.campus, tu.asset_code, tu.note
FROM tmp_inventory_units tu
JOIN products p
  ON lower(p.name) = tu.product_name
 AND lower(p.category) = tu.product_category
ON CONFLICT (product_id, unit_code) DO UPDATE
SET campus = EXCLUDED.campus,
    asset_code = EXCLUDED.asset_code,
    current_note = EXCLUDED.current_note,
    updated_at = timezone('utc'::text, now());

INSERT INTO inventory_unit_notes(unit_id, note)
SELECT iu.id, tu.note
FROM tmp_inventory_units tu
JOIN products p
  ON lower(p.name) = tu.product_name
 AND lower(p.category) = tu.product_category
JOIN inventory_units iu
  ON iu.product_id = p.id
 AND iu.unit_code = tu.unit_code
WHERE tu.note IS NOT NULL
ON CONFLICT DO NOTHING;

UPDATE products p
SET stock = sub.cnt,
    in_stock = (sub.cnt > 0)
FROM (
  SELECT product_id, COUNT(*)::int AS cnt
  FROM inventory_units
  WHERE status = 'active'
  GROUP BY product_id
) sub
WHERE p.id = sub.product_id;

COMMIT;