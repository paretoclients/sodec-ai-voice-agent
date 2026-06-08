import { NextResponse } from "next/server";

type AppointmentRequest = {
  name: string;
  phone: string;
  reason: string;
  preferredDate: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AppointmentRequest;
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  const hasServiceAccount = Boolean(
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
  );

  if (!calendarId) {
    return NextResponse.json({ status: "missing_calendar", calendarId: null }, { status: 500 });
  }

  if (!hasServiceAccount) {
    return NextResponse.json({
      status: "captured_pending_calendar_credentials",
      calendarId,
      appointment: {
        name: body.name,
        phone: body.phone,
        reason: body.reason,
        preferredDate: body.preferredDate
      }
    });
  }

  return NextResponse.json({
    status: "ready_for_google_calendar_write",
    calendarId,
    appointment: body
  });
}

