"use client";

import Image from "next/image";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

import { cn } from "@/lib/utils";
import { vapi } from "@/lib/vapi.sdk";
import { interviewer } from "@/constants";
import { createFeedback } from "@/lib/actions/general.action";
import { Message } from "@/types/vapi";

enum CallStatus {
  INACTIVE = "INACTIVE",
  CONNECTING = "CONNECTING",
  ACTIVE = "ACTIVE",
  FINISHED = "FINISHED",
}

interface SavedMessage {
  role: "user" | "system" | "assistant";
  content: string;
}

const Agent = ({
  userName,
  userId,
  interviewId,
  feedbackId,
  type,
  questions,
}: AgentProps) => {
  const router = useRouter();
  const [callStatus, setCallStatus] = useState<CallStatus>(CallStatus.INACTIVE);
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastMessage, setLastMessage] = useState<string>("");

  useEffect(() => {
    const onCallStart = () => {
      console.log("✅ Call started successfully");
      setCallStatus(CallStatus.ACTIVE);
    };

    const onCallEnd = () => {
      console.log("📞 Call ended");
      setCallStatus(CallStatus.FINISHED);
    };

    const onMessage = (message: Message) => {
      console.log("💬 Message received:", message);
      if (message.type === "transcript" && message.transcriptType === "final") {
        const newMessage = { role: message.role, content: message.transcript };
        setMessages((prev) => [...prev, newMessage]);
      }
    };

    const onSpeechStart = () => {
      console.log("🗣️ Speech start");
      setIsSpeaking(true);
    };

    const onSpeechEnd = () => {
      console.log("🤐 Speech end");
      setIsSpeaking(false);
    };

    const onError = (error: Record<string, unknown>) => {
      console.error("❌ VAPI ERROR:");
      console.error("Error object:", error);
      console.error(
        "Error message:",
        error?.message || error?.error || "Unknown"
      );
      console.error("Error details:", JSON.stringify(error, null, 2));

      // Don't show alert for "Meeting has ended" - this is expected when call ends
      const errorMsg = String(error?.message || "");
      if (errorMsg.includes("has ended") || errorMsg.includes("Meeting")) {
        console.log("Call ended normally");
        setCallStatus(CallStatus.FINISHED);
      } else {
        alert(
          `Call failed: ${error?.message || error?.error || "Unknown error"}`
        );
        setCallStatus(CallStatus.INACTIVE);
      }
    };

    vapi.on("call-start", onCallStart);
    vapi.on("call-end", onCallEnd);
    vapi.on("message", onMessage);
    vapi.on("speech-start", onSpeechStart);
    vapi.on("speech-end", onSpeechEnd);
    vapi.on("error", onError);

    // Global error handler for unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const errorMsg = String(event.reason?.message || event.reason || "");
      if (
        errorMsg.includes("has ended") ||
        errorMsg.includes("Meeting") ||
        errorMsg.includes("meeting has ended")
      ) {
        console.log("Suppressing expected 'Meeting has ended' error");
        event.preventDefault();
      }
    };

    // Suppress console errors related to "Meeting has ended"
    const originalError = console.error;
    const suppressedError = function (...args: unknown[]) {
      const errorStr = String(args[0] || "");
      if (
        !errorStr.includes("Meeting has ended") &&
        !errorStr.includes("has ended")
      ) {
        originalError.apply(console, args);
      }
    };
    console.error = suppressedError as typeof console.error;

    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      vapi.off("call-start", onCallStart);
      vapi.off("call-end", onCallEnd);
      vapi.off("message", onMessage);
      vapi.off("speech-start", onSpeechStart);
      vapi.off("speech-end", onSpeechEnd);
      vapi.off("error", onError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection
      );
      console.error = originalError;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setLastMessage(messages[messages.length - 1].content);
    }

    const handleGenerateFeedback = async (messages: SavedMessage[]) => {
      console.log("handleGenerateFeedback");

      const { success, feedbackId: id } = await createFeedback({
        interviewId: interviewId!,
        userId: userId!,
        transcript: messages,
        feedbackId,
      });

      if (success && id) {
        router.push(`/interview/${interviewId}/feedback`);
      } else {
        console.log("Error saving feedback");
        router.push("/");
      }
    };

    if (callStatus === CallStatus.FINISHED) {
      if (type === "generate") {
        router.push("/");
      } else {
        handleGenerateFeedback(messages);
      }
    }
  }, [messages, callStatus, feedbackId, interviewId, router, type, userId]);

  const handleCall = async () => {
    setCallStatus(CallStatus.CONNECTING);
    console.log("=== STARTING CALL ===");
    console.log("Type:", type);
    console.log("User:", userName, userId);
    console.log("Interview ID:", interviewId);

    try {
      if (type === "generate") {
        const workflowConfig = {
          variableValues: {
            username: userName,
            userid: userId,
          },
        };
        console.log("Workflow config:", workflowConfig);

        await vapi.start(
          process.env.NEXT_PUBLIC_VAPI_WORKFLOW_ID!,
          workflowConfig
        );
      } else {
        let formattedQuestions = "";
        if (questions) {
          formattedQuestions = questions
            .map((question) => `- ${question}`)
            .join("\n");
        }

        const assistantConfig = {
          variableValues: {
            questions: formattedQuestions,
          },
        };
        console.log("Assistant config:", assistantConfig);
        console.log("Interviewer value:", interviewer);

        await vapi.start(interviewer, assistantConfig);
      }
    } catch (error) {
      console.error("Error starting call:", error);
      setCallStatus(CallStatus.INACTIVE);
    }
  };

  const handleDisconnect = () => {
    setCallStatus(CallStatus.FINISHED);
    vapi.stop();
  };

  return (
    <>
      <div className="call-view">
        {/* AI Interviewer Card */}
        <div className="card-interviewer">
          <div className="avatar">
            <Image
              src="/ai-avatar.png"
              alt="profile-image"
              width={65}
              height={54}
              className="object-cover"
            />
            {isSpeaking && <span className="animate-speak" />}
          </div>
          <h3>AI Interviewer</h3>
        </div>

        {/* User Profile Card */}
        <div className="card-border">
          <div className="card-content">
            <Image
              src="/user-avatar.png"
              alt="profile-image"
              width={539}
              height={539}
              className="rounded-full object-cover size-[120px]"
            />
            <h3>{userName}</h3>
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="transcript-border">
          <div className="transcript">
            <p
              key={lastMessage}
              className={cn(
                "transition-opacity duration-500 opacity-0",
                "animate-fadeIn opacity-100"
              )}
            >
              {lastMessage}
            </p>
          </div>
        </div>
      )}

      <div className="w-full flex justify-center">
        {callStatus !== "ACTIVE" ? (
          <button className="relative btn-call" onClick={() => handleCall()}>
            <span
              className={cn(
                "absolute animate-ping rounded-full opacity-75",
                callStatus !== "CONNECTING" && "hidden"
              )}
            />

            <span className="relative">
              {callStatus === "INACTIVE" || callStatus === "FINISHED"
                ? "Call"
                : ". . ."}
            </span>
          </button>
        ) : (
          <button className="btn-disconnect" onClick={() => handleDisconnect()}>
            End
          </button>
        )}
      </div>
    </>
  );
};

export default Agent;
