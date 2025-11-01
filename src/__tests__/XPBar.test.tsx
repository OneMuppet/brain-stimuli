import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { XPBar } from "@/components/XPBar";

describe("XPBar Component", () => {
  it("should render XP value", () => {
    render(<XPBar xp={150} progress={50} combo={0} streakActive={false} />);
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("XP")).toBeInTheDocument();
  });

  it("should render level when provided", () => {
    render(<XPBar xp={250} progress={50} combo={0} streakActive={false} level={3} />);
    expect(screen.getByText("LEVEL 3")).toBeInTheDocument();
  });

  it("should not render level when not provided", () => {
    render(<XPBar xp={50} progress={25} combo={0} streakActive={false} />);
    expect(screen.queryByText(/LEVEL/i)).not.toBeInTheDocument();
  });

  it("should render combo indicator when combo > 0", () => {
    render(<XPBar xp={100} progress={50} combo={5} streakActive={false} />);
    expect(screen.getByText(/COMBO x5/i)).toBeInTheDocument();
  });

  it("should not render combo indicator when combo is 0", () => {
    render(<XPBar xp={100} progress={50} combo={0} streakActive={false} />);
    expect(screen.queryByText(/COMBO/i)).not.toBeInTheDocument();
  });

  it("should handle progress at 100%", () => {
    render(<XPBar xp={100} progress={100} combo={0} streakActive={false} />);
    expect(screen.getByText("100")).toBeInTheDocument();
  });

  it("should handle progress at 0%", () => {
    render(<XPBar xp={0} progress={0} combo={0} streakActive={false} />);
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("should render with different XP values", () => {
    const { rerender } = render(
      <XPBar xp={50} progress={25} combo={0} streakActive={false} />
    );
    expect(screen.getByText("50")).toBeInTheDocument();

    rerender(<XPBar xp={999} progress={75} combo={0} streakActive={false} />);
    expect(screen.getByText("999")).toBeInTheDocument();
  });

  it("should render level and combo together", () => {
    render(<XPBar xp={500} progress={80} combo={3} streakActive={false} level={5} />);
    expect(screen.getByText("LEVEL 5")).toBeInTheDocument();
    expect(screen.getByText("500")).toBeInTheDocument();
    expect(screen.getByText(/COMBO x3/i)).toBeInTheDocument();
  });

  it("should render all elements correctly", () => {
    render(<XPBar xp={1000} progress={90} combo={10} streakActive={true} level={10} />);
    expect(screen.getByText("LEVEL 10")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
    expect(screen.getByText(/COMBO x10/i)).toBeInTheDocument();
  });
});

