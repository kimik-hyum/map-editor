// 상용 경계 요청은 Cloudflare의 접속 국가 검사를 통과해야 합니다.
// 자체 Supabase를 사용하는 설치본은 해당 서버의 정책을 따릅니다.
export function regionEndpoint(supabaseUrl: string): string {
  return supabaseUrl.replace(/\/$/, "") === "https://wmfidaawutwavlwvqauh.supabase.co"
    ? "https://maps-editor.pages.dev/api/regions"
    : `${supabaseUrl.replace(/\/$/, "")}/functions/v1/regions`;
}
