// app/api/token-template/route.js
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public/print", "token.html");
    const html = fs.readFileSync(filePath, "utf-8");

    return new NextResponse(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      },
    });
  } catch (e) {
    return new NextResponse(
      "<html><body><h1>Token template not found</h1><p>public/token.html file missing</p></body></html>",
      {
        status: 404,
        headers: { "Content-Type": "text/html" },
      }
    );
  }
}
