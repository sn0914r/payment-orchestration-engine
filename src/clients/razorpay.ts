import Razorpay from "razorpay";
import { configs } from "../configs";

export const razorpay = new Razorpay({
  key_id: configs.RAZORPAY.KEY_ID,
  key_secret: configs.RAZORPAY.KEY_SECRET,
});
