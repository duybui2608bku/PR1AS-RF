import {
  registerUserSocket,
  unregisterUserSocket,
  isUserOnlineBulk,
} from "../socket.handlers";

describe("isUserOnlineBulk", () => {
  afterEach(() => {
    unregisterUserSocket("user-1", "socket-1");
  });

  it("returns only the ids that currently have an active socket", () => {
    registerUserSocket("user-1", "socket-1");

    expect(isUserOnlineBulk(["user-1", "user-2", "user-3"])).toEqual(
      new Set(["user-1"])
    );
  });

  it("returns an empty set when none of the ids are online", () => {
    expect(isUserOnlineBulk(["user-2", "user-3"])).toEqual(new Set());
  });
});
