import { NextResponse } from "next/server";
import { createCalendarAppointment } from "../../../lib/google-workspace";

type AppointmentRequest = {
  name: string;
  phone: string;
  reason: string;
  preferredDate: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as AppointmentRequest;
  try {
    const event = await createCalendarAppointment(body);
    return NextResponse.json({
      status: "calendar_event_created",
      eventId: event.eventId,
      url: event.url
    });
  } catch (error) {
    return NextResponse.json({
      status: "calendar_unavailable",
      error: error instanceof Error ? error.message : "Unknown Google Calendar error",
      appointment: body
    });
  }
}
