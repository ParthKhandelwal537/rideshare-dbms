import { NextRequest, NextResponse } from 'next/server';
import { getReviews, createReview } from '@/lib/db';

export async function GET() {
  try {
    const reviews = await getReviews();
    return NextResponse.json({ success: true, data: reviews });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { user_id, comments, rating } = body;

    if (!user_id || !comments) {
      return NextResponse.json(
        { success: false, message: 'User ID and review comments are required.' },
        { status: 400 }
      );
    }

    const reviewRating = typeof rating === 'number' ? rating : (Number(rating) || 5);
    const newReview = await createReview(user_id, comments, reviewRating);
    return NextResponse.json(
      { success: true, message: 'Review submitted.', data: newReview },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error.message || 'Failed to submit review' },
      { status: 400 }
    );
  }
}
