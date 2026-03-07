import dotenv from 'dotenv';
dotenv.config({ quiet: true });
import { notarize } from '@electron/notarize';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Finds the codesign identity used to sign the app bundle.
 * Parses the output of `codesign -dvv` to extract the signing authority.
 * Returns '-' (ad-hoc) if no identity can be determined.
 */
function getSigningIdentity(appPath)
{
  try
  {
    const output = execSync(`codesign -dvv "${appPath}" 2>&1`, { encoding: 'utf8' });
    const match = output.match(/^Authority=(.+)$/m);

    if (match && match[1] && match[1] !== '(unavailable)')
    {
      return match[1];
    }
  }
  catch (e)
  {
    // codesign failed, fall back to ad-hoc
  }

  return '-';
}

/**
 * Re-signs the Quick Look .appex with sandbox entitlements, then re-signs
 * the outer .app bundle so its seal includes the updated .appex.
 *
 * This runs in afterSign, after electron-builder has signed the entire app
 * (including the .appex with the inherited entitlements, which lack the
 * required sandbox entitlement for Quick Look extensions).
 */
function signQuickLookExtension(appPath)
{
  const appexPath = path.join(appPath, 'Contents', 'PlugIns', 'PreviewExtension.appex');

  if (!fs.existsSync(appexPath))
  {
    return;
  }

  const identity = getSigningIdentity(appPath);

  if (identity === '-')
  {
    console.log('Quick Look: no signing identity found, using ad-hoc signing');
  }
  else
  {
    console.log('Quick Look: re-signing with identity:', identity);
  }

  const entitlementsPath = path.join(__dirname, 'quicklook-entitlements.plist');
  const mainEntitlementsPath = path.join(__dirname, 'entitlements.mac.plist');

  // Re-sign the .appex with sandbox entitlements (required for Quick Look)
  execSync(
    `codesign -f -s "${identity}" --entitlements "${entitlementsPath}" --options runtime "${appexPath}"`,
    { stdio: 'inherit' }
  );

  // Re-sign the outer .app to update its seal (the .appex hash changed)
  execSync(
    `codesign -f -s "${identity}" --entitlements "${mainEntitlementsPath}" --options runtime "${appPath}"`,
    { stdio: 'inherit' }
  );

  console.log('Quick Look: re-signing complete');
}

export default async function notarizing(context) {
  const { electronPlatformName, appOutDir } = context;
  const appName = context.packager.appInfo.productFilename;

  if (electronPlatformName !== 'darwin') {
    return;
  }

  const appPath = `${appOutDir}/${appName}.app`;

  signQuickLookExtension(appPath);

  return await notarize({
    tool: "notarytool",
    appBundleId: 'com.jgraph.drawio.desktop',
    appPath: appPath,
    appleId: process.env.APPLEID,
    appleIdPassword: process.env.APPLEIDPASS,
    teamId: process.env.APPLE_TEAM_ID
  });
};
