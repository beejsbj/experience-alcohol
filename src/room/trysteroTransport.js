// WebRTC between the phones at the table. Public Nostr relays only carry the
// encrypted handshake; pours and receipts travel peer to peer. Nothing we run,
// nothing that stores the night.

const APP_ID = "experience-alcohol/rooms/v1";
const MESSAGE_TYPES = ["state", "hello"];

export async function connectTrystero({ code, onPeerJoin, onPeerLeave, onMessage, onError }) {
  const { joinRoom } = await import("trystero");
  const room = joinRoom({ appId: APP_ID, password: code }, code, {
    onJoinError: (details) => onError?.(details?.error ?? "could not reach them"),
  });

  const actions = Object.fromEntries(
    MESSAGE_TYPES.map((type) => {
      const action = room.makeAction(type);
      action.onMessage = (data, { peerId }) => onMessage(type, data, peerId);
      return [type, action];
    })
  );

  room.onPeerJoin = onPeerJoin;
  room.onPeerLeave = onPeerLeave;

  return {
    send: (type, data, peerId) =>
      actions[type].send(data, peerId ? { target: peerId } : undefined),
    leave: () => room.leave(),
  };
}
