import { ClientNotifier } from "./webhook.notifier";
import type {
  PaymentEventListener,
  PaymentStatusChangedEvent,
} from "./webhook.types";

export class PaymentEventBus {
  private static listeners: PaymentEventListener[] = [];

  public static subscribe(listener: PaymentEventListener): void {
    this.listeners.push(listener);
  }

  public static async emit(event: PaymentStatusChangedEvent): Promise<void> {
    for (const listener of this.listeners) {
      await listener(event);
    }
  }

  public static init(): void {
    this.subscribe(ClientNotifier.notify);
  }
}
