import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("services")
    .select("*")
    .limit(1);

  if (error) {
    return Response.json(
      {
        connected: true,
        error: error.message,
      },
      { status: 200 }
    );
  }

  return Response.json({
    connected: true,
    data,
  });
}