-- =============================================================================
-- Sonico — seed data: categories + 20 original sound-related products.
-- Images and 3D models are uploaded through the admin dashboard (product-media
-- bucket). Until a .glb is uploaded, the product page renders the procedural
-- 3D preset named in model_preset.
-- Safe to re-run: uses ON CONFLICT on slugs.
-- =============================================================================

insert into public.categories (slug, name, description, icon, accent, sort_order) values
  ('headphones',  'Headphones',        'Over-ear and on-ear headphones tuned for detail.',              'headphones',      '#FF7A1A', 10),
  ('earbuds',     'Earbuds',           'True wireless and wired in-ear monitors.',                       'earbuds',         '#F25C54', 20),
  ('speakers',    'Speakers',          'Portable, desktop and room-filling speakers.',                   'speaker',         '#2F80ED', 30),
  ('turntables',  'Turntables & Vinyl','Modern phonographs and vinyl care.',                             'album',           '#9B51E0', 40),
  ('keyboards',   'Keys & Synths',     'Playable keyboards, synths and MIDI controllers.',               'piano',           '#27AE60', 50),
  ('albums',      'Playable Albums',   'Physical albums that play themselves — art you can listen to.',  'library_music',   '#EB5757', 60),
  ('radios',      'Radios & Retro',    'Tuners, radios and nostalgic listening objects.',                'radio',           '#B7791F', 70),
  ('accessories', 'Accessories',       'Stands, cables, cases and functional desk gadgets.',             'cable',           '#5B5B63', 80)
on conflict (slug) do update set name = excluded.name, description = excluded.description,
  icon = excluded.icon, accent = excluded.accent, sort_order = excluded.sort_order;

with c as (select slug, id from public.categories)
insert into public.products
  (slug, sku, name, tagline, description, category_id, price, compare_at_price, stock,
   is_featured, is_new, model_preset, accent_color, features, specs)
values
-- 1
('echo-halo-anc', 'SNC-HP-001', 'Echo Halo ANC',
 'Adaptive silence with an ember-lit soul.',
 'Over-ear headphones with hybrid adaptive noise cancelling, memory-foam cushions wrapped in vegan protein leather, and a soft ember light ring that pulses with the beat or stays dark when you want to disappear.',
 (select id from c where slug='headphones'), 649.00, 749.00, 40, true, true, 'headphones', '#FF7A1A',
 '[{"icon":"noise_control_off","label":"Adaptive ANC"},{"icon":"graphic_eq","label":"Hi-Res Audio"},{"icon":"battery_full","label":"45 h battery"},{"icon":"bed","label":"Memory foam"}]',
 '{"Driver":"40 mm beryllium-coated","Frequency":"4 Hz – 40 kHz","Battery":"45 h (ANC on)","Codec":"LDAC, AAC, SBC","Weight":"268 g","Connection":"Bluetooth 5.4, USB-C audio"}'),
-- 2
('nocturne-studio-open', 'SNC-HP-002', 'Nocturne Studio Open',
 'Open-back reference for late-night mixing.',
 'Open-back studio headphones with a wide, natural stage. Machined aluminium yokes, replaceable velour pads and a detachable braided cable make it a mixing companion for decades.',
 (select id from c where slug='headphones'), 529.00, null, 25, false, false, 'headphones', '#C9B79C',
 '[{"icon":"tune","label":"Reference tuning"},{"icon":"handyman","label":"User-serviceable"},{"icon":"cable","label":"Detachable cable"}]',
 '{"Driver":"50 mm dynamic","Impedance":"80 Ω","Frequency":"5 Hz – 35 kHz","Weight":"310 g","Design":"Open-back"}'),
-- 3
('pulse-kids-safe', 'SNC-HP-003', 'Pulse Mini Safe-Volume',
 'Big sound, small ears, 85 dB limit.',
 'Lightweight headphones for young listeners with a hardware volume limiter, bend-proof headband and swappable colour caps that kids can design themselves.',
 (select id from c where slug='headphones'), 149.00, 179.00, 60, false, false, 'headphones', '#56CCF2',
 '[{"icon":"hearing","label":"85 dB limiter"},{"icon":"palette","label":"Swappable caps"},{"icon":"battery_full","label":"30 h battery"}]',
 '{"Driver":"32 mm","Volume limit":"85 dB","Battery":"30 h","Weight":"145 g"}'),
-- 4
('orbit-buds-pro', 'SNC-EB-001', 'Orbit Buds Pro',
 'Planet-ring case. Studio-grade buds.',
 'True wireless earbuds docked in a rotating ring-shaped charging case. Spatial audio with head tracking, six-mic call clarity and a case that doubles as a desk fidget.',
 (select id from c where slug='earbuds'), 389.00, 429.00, 80, true, true, 'earbuds', '#F25C54',
 '[{"icon":"spatial_audio","label":"Spatial audio"},{"icon":"mic","label":"6-mic calls"},{"icon":"water_drop","label":"IPX5"}]',
 '{"Driver":"11 mm","Battery":"8 h + 32 h case","Water resistance":"IPX5","Charging":"USB-C, Qi wireless"}'),
-- 5
('stagewire-iem', 'SNC-EB-002', 'StageWire IEM Duo',
 'Dual-driver in-ears for the stage and the train.',
 'Wired in-ear monitors with a dual balanced-armature + dynamic driver array, custom-fit memory tips and an interchangeable 3.5 mm / USB-C cable.',
 (select id from c where slug='earbuds'), 279.00, null, 35, false, false, 'earbuds', '#2D9CDB',
 '[{"icon":"graphic_eq","label":"Dual drivers"},{"icon":"cable","label":"Swappable cable"}]',
 '{"Drivers":"1 BA + 1 dynamic","Impedance":"18 Ω","Isolation":"Up to 30 dB"}'),
-- 6
('monolith-tower', 'SNC-SP-001', 'Monolith Tower 360',
 'A sculpture that fills the room in every direction.',
 'Floor-standing 360° speaker with an upward-firing tweeter array and a walnut base. Room calibration via the built-in microphone keeps bass tight in any corner.',
 (select id from c where slug='speakers'), 1890.00, null, 12, true, false, 'speaker', '#2F80ED',
 '[{"icon":"surround_sound","label":"360° sound"},{"icon":"auto_awesome","label":"Room calibration"},{"icon":"wifi","label":"Wi-Fi + AirPlay"}]',
 '{"Output":"240 W","Drivers":"1× 6.5\" woofer, 6× tweeters","Connectivity":"Wi-Fi, Bluetooth 5.3, HDMI eARC","Height":"98 cm"}'),
-- 7
('pebble-go', 'SNC-SP-002', 'Pebble Go',
 'A river stone that plays your summer.',
 'Palm-sized waterproof speaker with a silicone pebble shell, magnetic stacking for stereo pairs and a lanyard loop. Floats in the pool.',
 (select id from c where slug='speakers'), 189.00, 219.00, 120, false, false, 'speaker', '#27AE60',
 '[{"icon":"pool","label":"IP67 · floats"},{"icon":"link","label":"Stereo pairing"},{"icon":"battery_full","label":"16 h battery"}]',
 '{"Output":"12 W","Battery":"16 h","Water resistance":"IP67","Weight":"340 g"}'),
-- 8
('lumen-bookshelf-pair', 'SNC-SP-003', 'Lumen Bookshelf Pair',
 'Active bookshelf speakers with a light-reactive grille.',
 'A pair of active bookshelf speakers with a perforated metal grille backlit by a slow-breathing light that reacts to dynamics. Phono input lets you plug a turntable straight in.',
 (select id from c where slug='speakers'), 1190.00, 1290.00, 18, false, true, 'speaker', '#F2C94C',
 '[{"icon":"light_mode","label":"Reactive grille"},{"icon":"album","label":"Phono input"},{"icon":"speaker_group","label":"Stereo pair"}]',
 '{"Output":"2× 60 W","Inputs":"Phono, line, optical, USB-C, Bluetooth","Woofer":"5.25\""}'),
-- 9
('aurora-turntable', 'SNC-TT-001', 'Aurora Floating Turntable',
 'A phonograph that looks like it is levitating.',
 'Belt-drive turntable with an acrylic platter suspended on a magnetic isolation base, giving the illusion of floating. Built-in switchable phono preamp and Bluetooth out.',
 (select id from c where slug='turntables'), 1490.00, null, 15, true, true, 'turntable', '#9B51E0',
 '[{"icon":"album","label":"33/45 RPM"},{"icon":"bluetooth","label":"Bluetooth out"},{"icon":"settings_input_component","label":"Phono preamp"}]',
 '{"Drive":"Belt","Speeds":"33⅓, 45","Platter":"Acrylic 20 mm","Wow & flutter":"< 0.1%","Cartridge":"Moving magnet, elliptical"}'),
-- 10
('gramo-neo', 'SNC-TT-002', 'Gramo Neo Phonograph',
 'The brass horn, reimagined for streaming and vinyl.',
 'A modern phonograph with a spun-aluminium horn housing a full-range driver. Plays vinyl acoustically through the horn or streams over Wi-Fi — no cables in sight.',
 (select id from c where slug='turntables'), 1690.00, 1890.00, 8, false, false, 'turntable', '#B7791F',
 '[{"icon":"campaign","label":"Acoustic horn"},{"icon":"wifi","label":"Streaming"},{"icon":"album","label":"Vinyl playback"}]',
 '{"Horn":"Spun aluminium, 32 cm","Speeds":"33⅓, 45, 78","Connectivity":"Wi-Fi, Bluetooth","Finish":"Champagne / Graphite"}'),
-- 11
('groove-care-kit', 'SNC-TT-003', 'Groove Care Kit',
 'Everything your records need to sound new.',
 'Carbon fibre brush, ultrasonic-safe cleaning fluid, stylus brush, anti-static inner sleeves and a stylus-force gauge in a magnetic walnut case.',
 (select id from c where slug='turntables'), 119.00, null, 90, false, false, 'generic', '#8D6E63',
 '[{"icon":"cleaning_services","label":"Complete kit"},{"icon":"scale","label":"Stylus gauge"}]',
 '{"Includes":"7 pieces","Case":"Walnut with magnetic lid"}'),
-- 12
('loopkey-49', 'SNC-KB-001', 'LoopKey 49',
 'A keyboard that remembers every idea.',
 'A 49-key semi-weighted MIDI keyboard with a built-in looper, 16 velocity pads and a small OLED. Always-on capture records anything you play, so a happy accident is never lost.',
 (select id from c where slug='keyboards'), 899.00, null, 22, true, false, 'keyboard', '#27AE60',
 '[{"icon":"piano","label":"49 semi-weighted keys"},{"icon":"loop","label":"Built-in looper"},{"icon":"history","label":"Always-on capture"}]',
 '{"Keys":"49, semi-weighted, aftertouch","Pads":"16 RGB","Connectivity":"USB-C, 5-pin MIDI, Bluetooth MIDI","Power":"USB bus or battery"}'),
-- 13
('pocket-synth-tone', 'SNC-KB-002', 'Tone Pocket Synth',
 'A full synthesizer the size of a phone.',
 'A four-voice wavetable synth with a capacitive keybed, built-in speaker and sequencer. Sync two over Bluetooth for instant jams.',
 (select id from c where slug='keyboards'), 349.00, 399.00, 50, false, true, 'keyboard', '#BB6BD9',
 '[{"icon":"waves","label":"Wavetable engine"},{"icon":"speaker","label":"Built-in speaker"},{"icon":"sync","label":"Wireless sync"}]',
 '{"Voices":"4","Sequencer":"64 steps","Battery":"10 h","Weight":"220 g"}'),
-- 14
('typewave-mechanical', 'SNC-KB-003', 'TypeWave Musical Keyboard',
 'A mechanical computer keyboard that doubles as an instrument.',
 'Hot-swappable mechanical keyboard with a one-switch “Play mode” that turns the keys into a chromatic MIDI instrument. Includes a volume knob and a rotary encoder.',
 (select id from c where slug='keyboards'), 459.00, null, 30, false, false, 'keyboard', '#FF7A1A',
 '[{"icon":"keyboard","label":"Hot-swap switches"},{"icon":"music_note","label":"MIDI play mode"},{"icon":"tune","label":"Rotary encoder"}]',
 '{"Layout":"75%","Switches":"Tactile, hot-swap","Connectivity":"USB-C, Bluetooth, 2.4 GHz"}'),
-- 15
('vinyl-postcard-album', 'SNC-AL-001', 'Spin Postcard Album',
 'A postcard that plays a song when you open it.',
 'A collectible fold-out album card with a paper-thin playback module and printed speaker. Open it and the track plays; tap the corner to skip. Ships with an artist-curated 6-track edition.',
 (select id from c where slug='albums'), 69.00, null, 200, false, true, 'generic', '#EB5757',
 '[{"icon":"library_music","label":"6 tracks"},{"icon":"mail","label":"Postable"},{"icon":"recycling","label":"Recyclable paper"}]',
 '{"Playback":"6 tracks, 22 min","Battery":"≈ 300 plays, USB-C rechargeable","Size":"A5 folded"}'),
-- 16
('cassette-capsule', 'SNC-AL-002', 'Capsule Cassette Player',
 'A transparent album-player for the digital age.',
 'A clear-shell cassette-shaped player that holds a limited-edition album on an encrypted chip. Slot it into the included dock for speaker playback, or plug in headphones on the go.',
 (select id from c where slug='albums'), 159.00, 189.00, 70, true, false, 'radio', '#F2994A',
 '[{"icon":"album","label":"Limited album chip"},{"icon":"headphones","label":"3.5 mm out"},{"icon":"dock","label":"Speaker dock"}]',
 '{"Storage":"Album edition (lossless)","Battery":"12 h","Dock":"5 W speaker"}'),
-- 17
('waveform-frame', 'SNC-AL-003', 'Waveform Frame',
 'Your favourite song as wall art — that plays it.',
 'A framed, laser-etched waveform of a song you choose. Touch the frame and a hidden exciter speaker turns the glass into the sound source.',
 (select id from c where slug='albums'), 239.00, null, 40, false, false, 'generic', '#4F4F4F',
 '[{"icon":"touch_app","label":"Touch to play"},{"icon":"image","label":"Custom waveform"},{"icon":"speaker","label":"Glass speaker"}]',
 '{"Size":"40 × 30 cm","Speaker":"Glass exciter, 10 W","Power":"USB-C"}'),
-- 18
('retrotune-fm', 'SNC-RD-001', 'RetroTune FM/DAB+',
 'A walnut radio with a dial you want to touch.',
 'Analogue-feel radio with a weighted brass dial, DAB+, FM and internet radio. The needle glides across a backlit scale while presets live on six piano-key buttons.',
 (select id from c where slug='radios'), 329.00, null, 35, false, false, 'radio', '#B7791F',
 '[{"icon":"radio","label":"DAB+ / FM / Internet"},{"icon":"piano","label":"Piano-key presets"}]',
 '{"Bands":"DAB+, FM, Internet","Speaker":"3\" full-range, 15 W","Finish":"Walnut veneer"}'),
-- 19
('beatdock-stand', 'SNC-AC-001', 'BeatDock Headphone Stand',
 'A stand that charges, displays and plays.',
 'Aluminium headphone stand with a USB-C DAC/amp, a wireless charging pad in the base and an ambient light bar that follows your music.',
 (select id from c where slug='accessories'), 179.00, 199.00, 55, false, false, 'generic', '#5B5B63',
 '[{"icon":"battery_charging_full","label":"Qi charging"},{"icon":"settings_input_hdmi","label":"USB-C DAC"},{"icon":"light_mode","label":"Ambient light"}]',
 '{"DAC":"32-bit / 384 kHz","Output":"3.5 mm, 4.4 mm balanced","Charging":"15 W Qi"}'),
-- 20
('metronome-cube', 'SNC-AC-002', 'Tempo Cube',
 'A smart metronome, tuner and practice timer.',
 'A tactile cube: flip it to switch between metronome, chromatic tuner, drone and practice timer. Haptic pulse lets you feel the beat when playing loud.',
 (select id from c where slug='accessories'), 99.00, null, 110, false, true, 'generic', '#2D9CDB',
 '[{"icon":"timer","label":"Practice timer"},{"icon":"vibration","label":"Haptic beat"},{"icon":"tune","label":"Chromatic tuner"}]',
 '{"Modes":"Metronome, tuner, drone, timer","Battery":"20 h","Size":"6 cm cube"}')
on conflict (slug) do update set
  name = excluded.name, tagline = excluded.tagline, description = excluded.description,
  category_id = excluded.category_id, price = excluded.price, compare_at_price = excluded.compare_at_price,
  is_featured = excluded.is_featured, is_new = excluded.is_new, model_preset = excluded.model_preset,
  accent_color = excluded.accent_color, features = excluded.features, specs = excluded.specs;

-- -----------------------------------------------------------------------------
-- Make yourself an admin after signing up (run once in the SQL editor):
--   update public.profiles set role = 'admin' where email = 'you@example.com';
-- -----------------------------------------------------------------------------
