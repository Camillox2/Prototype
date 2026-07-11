import {existsSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import path from 'node:path';
const pkg=JSON.parse(readFileSync('package.json','utf8'));
const root='android/app/src/main/res';
if(!existsSync('android/app/build.gradle'))process.exit(0);
let gradle=readFileSync('android/app/build.gradle','utf8');
gradle=gradle.replace(/versionCode\s+\d+/,`versionCode ${Math.max(1,Number(pkg.version.split('.').join(''))||33)}`).replace(/versionName\s+['"][^'"]+['"]/,`versionName "${pkg.version}"`);
writeFileSync('android/app/build.gradle',gradle);
const vector=`<?xml version="1.0" encoding="utf-8"?><vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108"><path android:fillColor="#07111F" android:pathData="M0,0h108v108h-108z"/><path android:fillColor="#38BDF8" android:pathData="M16,18h76v15h-50v16h42v14h-42v29h-18v-74z"/><path android:fillColor="#FBBF24" android:pathData="M62,35h15v57h-16v-30l-10,17l-10,-17v-18l18,27l3,-5z"/></vector>`;
mkdirSync(path.join(root,'drawable'),{recursive:true});
writeFileSync(path.join(root,'drawable','futmaster_icon.xml'),vector);
writeFileSync(path.join(root,'drawable','futmaster_splash.xml'),`<?xml version="1.0" encoding="utf-8"?><layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:drawable="#07111F"/><item android:width="180dp" android:height="180dp" android:gravity="center" android:drawable="@drawable/futmaster_icon"/></layer-list>`);
const manifest='android/app/src/main/AndroidManifest.xml';let xml=readFileSync(manifest,'utf8');xml=xml.replace(/android:icon="[^"]+"/,'android:icon="@drawable/futmaster_icon"').replace(/android:roundIcon="[^"]+"/,'android:roundIcon="@drawable/futmaster_icon"');writeFileSync(manifest,xml);
const styles=path.join(root,'values','styles.xml');if(existsSync(styles)){let s=readFileSync(styles,'utf8').replace(/<item name="android:background">@drawable\/splash<\/item>/,'<item name="android:background">@drawable/futmaster_splash</item>');writeFileSync(styles,s);}
console.log(`Android personalizado para FutMaster ${pkg.version}`);
