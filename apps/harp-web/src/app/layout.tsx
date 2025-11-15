import './global.css';

export const metadata = {
  title: 'Virtual Interview Tester',
  description: 'Practice your technical interviews with AI',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
