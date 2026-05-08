"use client";

import { FormEvent, ReactNode, useEffect, useState } from "react";

type RoomGateProps = {
  children: ReactNode;
  description: string;
  ready: boolean;
  roomName: string;
  setRoomName: (roomName: string) => void;
  title: string;
};

export function RoomGate({
  children,
  description,
  ready: _ready,
  roomName,
  setRoomName,
  title,
}: RoomGateProps) {
  void _ready;

  const [draftRoomName, setDraftRoomName] = useState(roomName);

  useEffect(() => {
    setDraftRoomName(roomName);
  }, [roomName]);

  if (roomName) {
    return <>{children}</>;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const nextRoomName = String(formData.get("roomName") ?? "").trim();

    if (nextRoomName) {
      setRoomName(nextRoomName);
    }
  }

  return (
    <main className="pin-gate">
      <form className="pin-gate-card" onSubmit={handleSubmit}>
        <span className="pin-gate-eyebrow">방 이름 작업 공간</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <label>
          <span className="field-label">방 이름</span>
          <input
            autoFocus
            className="input"
            name="roomName"
            onChange={(event) => setDraftRoomName(event.target.value)}
            placeholder="예: 3학년 경제반"
            value={draftRoomName}
          />
        </label>
        <button className="primary-button" disabled={!draftRoomName.trim()} type="submit">
          들어가기
        </button>
      </form>
    </main>
  );
}

export function RoomBadge({
  label = "현재 방",
  roomName,
  onReset,
}: {
  label?: string;
  roomName: string;
  onReset: () => void;
}) {
  return (
    <div className="pin-badge">
      <span>{label}</span>
      <strong>{roomName}</strong>
      <button className="secondary-button compact-button" onClick={onReset} type="button">
        방 변경
      </button>
    </div>
  );
}

export { RoomBadge as PinBadge, RoomGate as PinGate };
