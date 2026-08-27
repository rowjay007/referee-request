package handlers

import (
	"reflect"
	"testing"
	"time"

	"github.com/rowjay007/referee-request/backend/internal/store"
)

func TestEvaluateRequestReadiness(t *testing.T) {
	now := time.Date(2026, time.August, 27, 10, 0, 0, 0, time.UTC)
	base := store.ReferenceRequest{
		RefereeName:         "Dr. Maya Chen",
		RefereeEmail:        "maya.chen@example.com",
		RefereeRelationship: "Professor",
		InstitutionName:     "Northbridge University",
		ProgrammeName:       "MSc Computer Science",
		OpportunityType:     "Postgraduate",
		DeadlineAt:          now.Add(72 * time.Hour),
		Instructions:        "Please highlight research collaboration and communication skills.",
	}

	tests := []struct {
		name             string
		request          store.ReferenceRequest
		documentsCount   int
		wantReady        bool
		wantMissing      []string
		wantChecklistMap map[string]any
	}{
		{
			name:           "ready when all requirements are present",
			request:        base,
			documentsCount: 1,
			wantReady:      true,
			wantMissing:    []string{},
			wantChecklistMap: map[string]any{
				"refereeInformation":    true,
				"applicationPurpose":    true,
				"deadline":              true,
				"candidateContext":      true,
				"supportingInformation": true,
			},
		},
		{
			name: "missing referee information",
			request: func() store.ReferenceRequest {
				r := base
				r.RefereeName = ""
				return r
			}(),
			documentsCount: 1,
			wantReady:      false,
			wantMissing:    []string{"refereeInformation"},
			wantChecklistMap: map[string]any{
				"refereeInformation":    false,
				"applicationPurpose":    true,
				"deadline":              true,
				"candidateContext":      true,
				"supportingInformation": true,
			},
		},
		{
			name: "missing application purpose",
			request: func() store.ReferenceRequest {
				r := base
				r.ProgrammeName = ""
				return r
			}(),
			documentsCount: 1,
			wantReady:      false,
			wantMissing:    []string{"applicationPurpose"},
			wantChecklistMap: map[string]any{
				"refereeInformation":    true,
				"applicationPurpose":    false,
				"deadline":              true,
				"candidateContext":      true,
				"supportingInformation": true,
			},
		},
		{
			name: "missing valid future deadline",
			request: func() store.ReferenceRequest {
				r := base
				r.DeadlineAt = now
				return r
			}(),
			documentsCount: 1,
			wantReady:      false,
			wantMissing:    []string{"deadline"},
			wantChecklistMap: map[string]any{
				"refereeInformation":    true,
				"applicationPurpose":    true,
				"deadline":              false,
				"candidateContext":      true,
				"supportingInformation": true,
			},
		},
		{
			name: "missing candidate context instructions",
			request: func() store.ReferenceRequest {
				r := base
				r.Instructions = "\t  "
				return r
			}(),
			documentsCount: 1,
			wantReady:      false,
			wantMissing:    []string{"candidateContext"},
			wantChecklistMap: map[string]any{
				"refereeInformation":    true,
				"applicationPurpose":    true,
				"deadline":              true,
				"candidateContext":      false,
				"supportingInformation": true,
			},
		},
		{
			name:           "missing supporting documents",
			request:        base,
			documentsCount: 0,
			wantReady:      false,
			wantMissing:    []string{"supportingInformation"},
			wantChecklistMap: map[string]any{
				"refereeInformation":    true,
				"applicationPurpose":    true,
				"deadline":              true,
				"candidateContext":      true,
				"supportingInformation": false,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := evaluateRequestReadiness(tt.request, tt.documentsCount, now)

			if got.Ready != tt.wantReady {
				t.Fatalf("Ready mismatch: got %v, want %v", got.Ready, tt.wantReady)
			}

			if !reflect.DeepEqual(got.MissingFields, tt.wantMissing) {
				t.Fatalf("MissingFields mismatch: got %v, want %v", got.MissingFields, tt.wantMissing)
			}

			if !reflect.DeepEqual(got.Checklist, tt.wantChecklistMap) {
				t.Fatalf("Checklist mismatch: got %v, want %v", got.Checklist, tt.wantChecklistMap)
			}
		})
	}
}

func TestValidateCreateReferenceRequestGlobalFields(t *testing.T) {
	base := createReferenceRequestPayload{
		RefereeName:         "Dr. Maya Chen",
		RefereeEmail:        "maya@example.com",
		RefereeRelationship: "Professor",
		InstitutionName:     "Northbridge University",
		ProgrammeName:       "MSc Computer Science",
		OpportunityType:     "academic",
		DeadlineAt:          "2027-01-30T12:00:00Z",
		ConfidentialityMode: "confidential",
		CountryCode:         "GB",
		Timezone:            "Europe/London",
	}

	tests := []struct {
		name      string
		mutate    func(*createReferenceRequestPayload)
		wantField string
	}{
		{
			name: "invalid confidentiality mode",
			mutate: func(payload *createReferenceRequestPayload) {
				payload.ConfidentialityMode = "private"
			},
			wantField: "confidentialityMode",
		},
		{
			name: "invalid country code",
			mutate: func(payload *createReferenceRequestPayload) {
				payload.CountryCode = "GBR"
			},
			wantField: "countryCode",
		},
		{
			name: "invalid timezone",
			mutate: func(payload *createReferenceRequestPayload) {
				payload.Timezone = "London"
			},
			wantField: "timezone",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			payload := base
			test.mutate(&payload)
			details := validateCreateReferenceRequest(payload)
			if _, ok := details[test.wantField]; !ok {
				t.Fatalf("validation details = %v, want field %q", details, test.wantField)
			}
		})
	}
}
