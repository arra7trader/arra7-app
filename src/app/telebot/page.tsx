import { redirect } from 'next/navigation';

export default function TelebotPage() {
  redirect('/payment/transfer?plan=TELEBOT&duration=1month&days=30');
}
