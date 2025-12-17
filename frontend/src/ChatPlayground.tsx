import { useState, useRef, useEffect } from "react";
import {
  Box,
  VStack,
  HStack,
  Text,
  Input,
  Button,
  Card,
  Heading,
  Badge,
  Spinner,
  IconButton,
} from "@chakra-ui/react";
import { HiArrowLeft, HiPaperAirplane } from "react-icons/hi";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

interface ChatPlaygroundProps {
  traceId: string;
  traceName: string;
  onBack: () => void;
}

export default function ChatPlayground({ traceId, traceName, onBack }: ChatPlaygroundProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper function to render markdown links and bold text
  const renderMessageContent = (content: string) => {
    // Convert markdown to HTML
    const htmlContent = content
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" style="color: #6366f1; text-decoration: underline; font-weight: 600;" download>$1</a>')
      .replace(/\n/g, '<br/>');
    
    return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
  };

  useEffect(() => {
    // Initialize with trace context
    setMessages([
      {
        role: "system",
        content: `Loaded trace: ${traceName}. You can now interact with the agent to modify or regenerate slides based on this trace.`,
        timestamp: new Date().toISOString(),
      },
    ]);
  }, [traceId, traceName]);

  useEffect(() => {
    // Auto-scroll to bottom
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trace_id: traceId,
          message: input,
          history: messages.filter((m) => m.role !== "system"),
        }),
      });

      if (!response.ok) throw new Error("Failed to send message");

      const data = await response.json();

      const assistantMessage: Message = {
        role: "assistant",
        content: data.response,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: Message = {
        role: "assistant",
        content: "Sorry, there was an error processing your message. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <Box h="100vh" bg="slate.50" display="flex" flexDirection="column">
      {/* Header */}
      <Box
        bg="white"
        borderBottomWidth="1px"
        borderColor="slate.200"
        shadow="subtle"
        p={4}
      >
        <HStack justify="space-between">
          <HStack gap={3}>
            <IconButton
              aria-label="Back to annotation"
              size="sm"
              variant="ghost"
              onClick={onBack}
            >
              <HiArrowLeft />
            </IconButton>
            <VStack align="start" gap={0}>
              <Heading size="md" fontWeight="700">
                Agent Playground
              </Heading>
              <Text fontSize="sm" color="slate.500">
                {traceName}
              </Text>
            </VStack>
          </HStack>
          <Badge colorScheme="purple" px={3} py={1} borderRadius="full">
            Trace: {traceId.slice(0, 8)}...
          </Badge>
        </HStack>
      </Box>

      {/* Messages */}
      <Box flex="1" overflowY="auto" p={6}>
        <VStack gap={4} align="stretch" maxW="4xl" mx="auto">
          {messages.map((msg, idx) => (
            <Card.Root
              key={idx}
              bg={msg.role === "user" ? "brand.50" : "white"}
              borderWidth="1px"
              borderColor={msg.role === "user" ? "brand.200" : "slate.200"}
              shadow="subtle"
            >
              <Card.Body p={4}>
                <VStack align="stretch" gap={2}>
                  <HStack justify="space-between">
                    <Badge
                      colorScheme={
                        msg.role === "user"
                          ? "brand"
                          : msg.role === "system"
                          ? "gray"
                          : "purple"
                      }
                      fontSize="xs"
                    >
                      {msg.role}
                    </Badge>
                    <Text fontSize="xs" color="slate.500">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </Text>
                  </HStack>
                  <Box fontSize="sm">
                    {renderMessageContent(msg.content)}
                  </Box>
                </VStack>
              </Card.Body>
            </Card.Root>
          ))}
          {loading && (
            <HStack justify="center" p={4}>
              <Spinner size="sm" color="brand.500" />
              <Text fontSize="sm" color="slate.500">
                Agent is thinking...
              </Text>
            </HStack>
          )}
          <div ref={messagesEndRef} />
        </VStack>
      </Box>

      {/* Input */}
      <Box
        bg="white"
        borderTopWidth="1px"
        borderColor="slate.200"
        p={4}
        shadow="elevated"
      >
        <HStack maxW="4xl" mx="auto" gap={2}>
          <Input
            placeholder="Ask the agent to modify slides, explain decisions, or regenerate..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={loading}
            size="lg"
            borderRadius="xl"
          />
          <Button
            colorScheme="brand"
            size="lg"
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            borderRadius="xl"
            px={6}
          >
            <HiPaperAirplane />
          </Button>
        </HStack>
      </Box>
    </Box>
  );
}

