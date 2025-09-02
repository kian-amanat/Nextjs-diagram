import "./globals.css";
import ThemeProviderClient from "./theme-provider";

export const metadata = {
  title: "Diagram Flow | Next + MUI",
  description:
    "Flowchart-like diagram with context menu (Cut/Copy/Paste/Delete/Add).",
};

export default function RootLayout({ children }) {
  return (
    <html lang="fa" dir="rtl">
      <body>
        <ThemeProviderClient>{children}</ThemeProviderClient>
      </body>
    </html>
  );
}
