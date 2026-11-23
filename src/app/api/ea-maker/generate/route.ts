import { NextRequest, NextResponse } from 'next/server';
import { compileEA } from '@/lib/ea-maker/compiler';
import { isLicenseAuthorized } from '@/lib/indicator-maker/rate-limiter';
import { EAStyle, EAPair, RiskModel } from '@/lib/ea-maker/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      customName = 'PICA_Alpha_Bot',
      style = 'scalping',
      pair = 'XAUUSD',
      moduleIds = [],
      licenseCode = '',
      riskModel = 'percent_equity',
      fixedLot = 0.01,
      riskPercent = 1.0,
      useAtrSlTp = true,
      atrMultiplierSl = 1.5,
      atrMultiplierTp = 2.5,
      useTrailingStop = true,
      trailingStopPoints = 150,
      useBreakEven = true,
      breakEvenTriggerPoints = 120,
      maxSpreadPoints = 40,
      magicNumber = 777101
    } = body;

    // Style validation
    if (!['hft', 'scalping', 'intraday'].includes(style)) {
      return NextResponse.json(
        { status: 'error', message: 'Gaya trading harus "hft", "scalping", atau "intraday"' },
        { status: 400 }
      );
    }

    // Pair validation
    if (!['XAUUSD', 'EURUSD', 'GBPUSD', 'BTCUSD', 'UNIVERSAL'].includes(pair)) {
      return NextResponse.json(
        { status: 'error', message: 'Target pair tidak valid' },
        { status: 400 }
      );
    }

    // Module validation
    if (!Array.isArray(moduleIds) || moduleIds.length === 0) {
      return NextResponse.json(
        { status: 'error', message: 'Pilih minimal 1 modul strategi untuk merakit EA' },
        { status: 400 }
      );
    }

    if (moduleIds.length > 4) {
      return NextResponse.json(
        { status: 'error', message: 'Maksimal 4 modul strategi untuk menjaga stabilitas eksekusi robot' },
        { status: 400 }
      );
    }

    // Strict Passkey & License Gate
    const cleanLicense = (licenseCode || '').trim().toUpperCase();
    if (!cleanLicense) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'LICENSE_REQUIRED',
          message: 'Akses Terkunci. Masukkan Kunci Lisensi atau Passkey VIP Anda untuk merakit EA. Passkey Founder: ARLAND77'
        },
        { status: 403 }
      );
    }

    const authCheck = await isLicenseAuthorized(cleanLicense);
    if (!authCheck.valid) {
      return NextResponse.json(
        {
          status: 'error',
          code: 'INVALID_LICENSE',
          message: authCheck.reason || 'Kunci Lisensi atau Passkey tidak valid.'
        },
        { status: 403 }
      );
    }

    // Compile the EA
    const result = compileEA({
      customName,
      style: style as EAStyle,
      pair: pair as EAPair,
      moduleIds,
      licenseCode: cleanLicense,
      riskModel: riskModel as RiskModel,
      fixedLot: Number(fixedLot) || 0.01,
      riskPercent: Number(riskPercent) || 1.0,
      useAtrSlTp: Boolean(useAtrSlTp),
      atrMultiplierSl: Number(atrMultiplierSl) || 1.5,
      atrMultiplierTp: Number(atrMultiplierTp) || 2.5,
      useTrailingStop: Boolean(useTrailingStop),
      trailingStopPoints: Number(trailingStopPoints) || 150,
      useBreakEven: Boolean(useBreakEven),
      breakEvenTriggerPoints: Number(breakEvenTriggerPoints) || 120,
      maxSpreadPoints: Number(maxSpreadPoints) || 40,
      magicNumber: Number(magicNumber) || 777101
    });

    return NextResponse.json({
      status: 'success',
      data: result
    });

  } catch (error: any) {
    console.error('EA Compiler error:', error);
    return NextResponse.json(
      { status: 'error', message: error.message || 'Gagal merakit Expert Advisor' },
      { status: 500 }
    );
  }
}
